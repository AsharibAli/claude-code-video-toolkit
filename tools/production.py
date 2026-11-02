"""Validated production tasks and a checkpointed, shell-free subprocess runner."""
from __future__ import annotations

import contextlib
import hashlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone


class BuildError(ValueError):
    """A production plan or checkpoint cannot be used safely."""


def canonical(path: Path) -> Path:
    value = str(path.resolve())
    if value.startswith("\\\\?\\UNC\\"):
        value = "\\\\" + value[8:]
    elif value.startswith("\\\\?\\"):
        value = value[4:]
    return Path(value)


def project_path(project: Path, value: str, *, allow_root: bool = False) -> Path:
    root = canonical(project)
    if not isinstance(value, str) or not value or Path(value).is_absolute():
        raise BuildError(f"Expected a project-relative path, got {value!r}")
    path = canonical(root / value)
    if not path.is_relative_to(root) or (path == root and not allow_root):
        raise BuildError(f"Path leaves the project or points at its root: {value}")
    return path


def read_json(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise BuildError(f"Cannot read {path}: {exc}") from exc
    if not isinstance(data, dict):
        raise BuildError(f"Expected a JSON object in {path}")
    return data


def validate_plan(value: object, project: Path) -> dict:
    """Validate a production block without changing it or the filesystem."""
    if not isinstance(value, dict) or value.get("version") != 1:
        raise BuildError("production.version must be 1")
    tasks = value.get("tasks")
    if not isinstance(tasks, list) or not tasks:
        raise BuildError("production.tasks must be a nonempty array")
    ids, claimed_outputs = set(), {}
    for task in tasks:
        if not isinstance(task, dict):
            raise BuildError("Every task must be an object")
        task_id = task.get("id")
        if not isinstance(task_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]*", task_id):
            raise BuildError(f"Invalid task id: {task_id!r}")
        if task_id in ids:
            raise BuildError(f"Duplicate task id: {task_id}")
        ids.add(task_id)
        argv = task.get("command")
        if not isinstance(argv, list) or not argv or any(not isinstance(s, str) or not s or "\0" in s for s in argv):
            raise BuildError(f"{task_id}: command must be a nonempty array of argv strings")
        for field in ("inputs", "outputs", "dependsOn"):
            items = task.get(field, [])
            if not isinstance(items, list) or any(not isinstance(s, str) or not s for s in items):
                raise BuildError(f"{task_id}: {field} must be an array of strings")
        for field in ("inputs", "outputs"):
            for item in task.get(field, []):
                project_path(project, item)
                if field == "outputs" and any(c in item for c in "*?["):
                    raise BuildError(f"{task_id}: outputs cannot contain globs")
        project_path(project, task.get("cwd", "."), allow_root=True)
        if task.get("stdoutFile") is not None:
            project_path(project, task["stdoutFile"])
            if any(c in task["stdoutFile"] for c in "*?["):
                raise BuildError(f"{task_id}: stdoutFile cannot contain globs")
        for output in outputs_for(task):
            path = project_path(project, output)
            if path in {project_path(project, ".video-toolkit/build-state.json"),
                        project_path(project, ".video-toolkit/build.lock")}:
                raise BuildError(f"{task_id}: output is a reserved checkpoint path")
            if path in claimed_outputs:
                raise BuildError(f"{task_id}: output already owned by {claimed_outputs[path]}: {output}")
            claimed_outputs[path] = task_id
        for field in ("timeoutSeconds", "estimatedCostUsd"):
            number = task.get(field)
            if number is not None and (isinstance(number, bool) or not isinstance(number, (int, float))
                                       or not math.isfinite(number) or number < 0
                                       or (field == "timeoutSeconds" and number == 0)):
                raise BuildError(f"{task_id}: invalid {field}")
    ordered_tasks(value)  # dependencies and cycles
    return json.loads(json.dumps(value))


def ordered_tasks(plan: dict) -> list[dict]:
    tasks = {t["id"]: t for t in plan["tasks"]}
    for task in tasks.values():
        missing = set(task.get("dependsOn", [])) - tasks.keys()
        if missing:
            raise BuildError(f"{task['id']}: unknown dependencies: {', '.join(sorted(missing))}")
    ordered, seen = [], set()
    while len(ordered) < len(tasks):
        ready = [t for t in tasks.values() if t["id"] not in seen
                 and set(t.get("dependsOn", [])) <= seen]
        if not ready:
            raise BuildError("Task dependencies contain a cycle")
        for task in ready:
            ordered.append(task)
            seen.add(task["id"])
    return ordered


def outputs_for(task: dict) -> list[str]:
    return list(dict.fromkeys(task.get("outputs", []) + ([task["stdoutFile"]] if task.get("stdoutFile") else [])))


def expand_command(task: dict, project: Path, toolkit: Path) -> list[str]:
    substitutions = {"{python}": sys.executable, "{project}": str(canonical(project)),
                     "{toolkit}": str(canonical(toolkit))}
    argv = []
    for value in task["command"]:
        for key, replacement in substitutions.items():
            value = value.replace(key, replacement)
        argv.append(value)
    return argv


def definition_hash(task: dict, project: Path, toolkit: Path) -> str:
    definition = {**task, "command": expand_command(task, project, toolkit)}
    return hashlib.sha256(json.dumps(definition, sort_keys=True).encode()).hexdigest()


def atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(text)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


@contextlib.contextmanager
def build_lock(project: Path):
    """Use an OS lock, automatically released even if the process crashes."""
    path = project_path(project, ".video-toolkit/build.lock")
    path.parent.mkdir(parents=True, exist_ok=True)
    stream = path.open("a+b")
    try:
        stream.seek(0, os.SEEK_END)
        if stream.tell() == 0:
            stream.write(b"0")
            stream.flush()
        stream.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            raise BuildError("Another build is running for this project") from exc
        try:
            yield
        finally:
            stream.seek(0)
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)
    finally:
        stream.close()


def load_state(project: Path) -> dict:
    path = project_path(project, ".video-toolkit/build-state.json")
    if not path.exists():
        return {"version": 1, "tasks": {}}
    data = read_json(path)
    if data.get("version") != 1 or not isinstance(data.get("tasks"), dict):
        raise BuildError("Unsupported or invalid build-state.json; preserve it before starting over")
    if any(not isinstance(record, dict) for record in data["tasks"].values()):
        raise BuildError("Invalid task checkpoint record")
    return data


def verify_outputs(task: dict, project: Path) -> None:
    for output in outputs_for(task):
        path = project_path(project, output)
        if not path.is_file() or path.stat().st_size == 0:
            raise BuildError(f"{task['id']}: expected nonempty output file: {output}")


def resumable(task: dict, record: dict, project: Path, toolkit: Path) -> bool:
    if record.get("status") != "succeeded" or not outputs_for(task):
        return False
    if record.get("definition") != definition_hash(task, project, toolkit):
        return False
    try:
        verify_outputs(task, project)
    except (BuildError, OSError):
        return False
    return True


def plan_build(project: Path, plan: dict, toolkit: Path, *, restart: bool = False) -> dict:
    plan = validate_plan(plan, project)
    state = load_state(project)
    entries, changed = [], set()
    for task in ordered_tasks(plan):
        skip = (not restart and not set(task.get("dependsOn", [])) & changed
                and resumable(task, state["tasks"].get(task["id"], {}), project, toolkit))
        if not skip:
            changed.add(task["id"])
        entries.append({"id": task["id"], "action": "resume" if skip else "run",
                        "command": expand_command(task, project, toolkit),
                        "cwd": str(project_path(project, task.get("cwd", "."), allow_root=True)),
                        "dependsOn": task.get("dependsOn", []), "outputs": outputs_for(task),
                        "estimatedCostUsd": task.get("estimatedCostUsd")})
    return {"version": 1, "project": str(canonical(project)), "tasks": entries}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def execute_task(task: dict, project: Path, toolkit: Path) -> None:
    cwd = project_path(project, task.get("cwd", "."), allow_root=True)
    if not cwd.is_dir():
        raise BuildError(f"{task['id']}: working directory does not exist: {cwd}")
    env = {**os.environ, "PYTHONIOENCODING": "utf-8", "VIDEO_TOOLKIT_ROOT": str(toolkit)}
    result = subprocess.run(expand_command(task, project, toolkit), cwd=cwd, env=env,
                            stdin=subprocess.DEVNULL, capture_output=True, text=True,
                            encoding="utf-8", errors="replace", timeout=task.get("timeoutSeconds", 1800),
                            shell=False)
    if result.returncode:
        tail = (result.stderr or result.stdout)[-3000:]
        raise BuildError(f"{task['id']}: command exited {result.returncode}\n{tail}")
    if task.get("stdoutFile"):
        atomic_write(project_path(project, task["stdoutFile"]), result.stdout)
    verify_outputs(task, project)


def run_build(project: Path, plan: dict, toolkit: Path, *, restart: bool = False) -> dict:
    plan = validate_plan(plan, project)
    with build_lock(project):
        preview = plan_build(project, plan, toolkit, restart=restart)
        state = load_state(project)
        state_path = project_path(project, ".video-toolkit/build-state.json")
        tasks = {t["id"]: t for t in plan["tasks"]}
        summary = {"success": True, "completed": [], "resumed": [], "failed": None}
        for entry in preview["tasks"]:
            task_id = entry["id"]
            if entry["action"] == "resume":
                summary["resumed"].append(task_id)
                continue
            task = tasks[task_id]
            previous = state["tasks"].get(task_id, {})
            record = {"definition": definition_hash(task, project, toolkit), "status": "running",
                      "startedAt": _now(), "attempts": previous.get("attempts", 0) + 1,
                      "outputs": outputs_for(task)}
            state["tasks"][task_id] = record
            atomic_write(state_path, json.dumps(state, indent=2) + "\n")
            print(f"Running {task_id}", file=sys.stderr, flush=True)
            try:
                execute_task(task, project, toolkit)
            except (BuildError, OSError, subprocess.SubprocessError, KeyboardInterrupt) as exc:
                record.update(status="failed", finishedAt=_now(), error=str(exc) or "Interrupted")
                atomic_write(state_path, json.dumps(state, indent=2) + "\n")
                summary.update(success=False, failed={"id": task_id, "error": record["error"]})
                return summary
            record.update(status="succeeded", finishedAt=_now())
            atomic_write(state_path, json.dumps(state, indent=2) + "\n")
            summary["completed"].append(task_id)
        return summary
