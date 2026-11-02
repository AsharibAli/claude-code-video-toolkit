#!/usr/bin/env python3
"""Plan or run a resumable video-production graph. Preview is the default."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import shlex
import sys

from production import BuildError, plan_build, project_path, read_json, run_build, validate_plan

TOOLKIT = Path(__file__).resolve().parent.parent


def builtin_plan(project: Path, *, provider: str = "elevenlabs", cloud: str = "modal",
                 captions: bool = False, caption_engine: str = "whisper") -> dict:
    """Connect existing per-scene narration, timing, QC, and Remotion CLIs."""
    package = read_json(project / "package.json")
    try:
        render = shlex.split(package["scripts"]["render"])
    except (KeyError, TypeError, ValueError) as exc:
        raise BuildError("Built-in plan needs a package.json Remotion render script") from exc
    if render[:2] == ["npx", "remotion"]:
        render = render[1:]
    if render[:2] != ["remotion", "render"] or any(token in {"&&", ";", "|", ">", "<"} for token in render):
        raise BuildError("Built-in plan supports a plain `remotion render ...` script; supply --plan for other builds")
    candidates = [v for v in render[2:] if v.lower().endswith((".mp4", ".webm", ".mov", ".gif"))]
    if len(candidates) != 1:
        raise BuildError("Could not identify one render output; supply an explicit --plan")
    video = candidates[0]
    project_path(project, video)
    manifest = read_json(project / "project.json") if (project / "project.json").exists() else {}
    tasks = []
    audio_ids = []
    caption_ids = []
    scripts = sorted((project / "public/audio/scenes").glob("*.txt"))
    for i, script in enumerate(scripts):
        script_rel = script.relative_to(project).as_posix()
        audio = script.with_suffix(".mp3").relative_to(project).as_posix()
        task_id = f"voiceover-{i + 1:03d}"
        argv = ["{python}", "{toolkit}/tools/voiceover.py", "--script", "{project}/" + script_rel,
                "--output", "{project}/" + audio, "--provider", provider, "--cloud", cloud, "--json"]
        if manifest.get("brand"):
            argv += ["--brand", manifest["brand"]]
        tasks.append({"id": task_id, "command": argv, "inputs": [script_rel], "outputs": [audio]})
        audio_ids.append(task_id)
        if captions:
            caption_id = f"captions-{i + 1:03d}"
            caption_ids.append(caption_id)
            tasks.append({"id": caption_id, "dependsOn": [task_id],
                          "command": ["{python}", "{toolkit}/tools/captions.py", "{project}/" + audio,
                                      "--engine", caption_engine, "--json"],
                          "inputs": [audio, script_rel],
                          "outputs": [audio[:-4] + ".captions.json"]})
    configs = [p for p in ("src/config/sprint-config.ts", "src/config/demo-config.ts")
               if (project / p).is_file()]
    if not configs:
        raise BuildError("Built-in plan needs src/config/sprint-config.ts or demo-config.ts; use --plan for custom templates")
    qc_deps = audio_ids + caption_ids
    if scripts and configs:
        config = configs[0]
        tasks.append({"id": "timing", "dependsOn": audio_ids,
                      "command": ["{python}", "{toolkit}/tools/sync_timing.py", "--config",
                                  "{project}/" + config, "--audio-dir", "{project}/public/audio/scenes",
                                  "--apply", "--json"],
                      "inputs": [config, "public/audio/scenes/*.mp3"], "outputs": [config],
                      "stdoutFile": ".video-toolkit/reports/timing.json"})
        qc_deps = ["timing"] + caption_ids
    tasks.extend([
        {"id": "qc-before", "dependsOn": qc_deps,
         "command": ["{python}", "{toolkit}/tools/qc.py", "--project", "{project}", "--json"],
         "inputs": ["src", "public"], "outputs": [], "stdoutFile": ".video-toolkit/reports/qc-before.json"},
        {"id": "render", "dependsOn": ["qc-before"],
         "command": ["node", "{project}/node_modules/@remotion/cli/remotion-cli.js", *render[1:]],
         "inputs": ["src", "public", "package.json"], "outputs": [video], "timeoutSeconds": 7200},
        {"id": "qc-after", "dependsOn": ["render"],
         "command": ["{python}", "{toolkit}/tools/qc.py", "--project", "{project}",
                     "--render", "{project}/" + video, "--json"],
         "inputs": [video], "outputs": [], "stdoutFile": ".video-toolkit/reports/qc-after.json"},
    ])
    return validate_plan({"version": 1, "tasks": tasks}, project)


def load_plan(project: Path, path: Path | None = None, *, builtin: bool = False, **options) -> dict:
    if path:
        data = read_json(path)
        return validate_plan(data.get("production", data), project)
    manifest = project / "project.json"
    if not builtin and manifest.exists():
        data = read_json(manifest)
        if "production" in data:
            return validate_plan(data["production"], project)
    return builtin_plan(project, **options)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path.cwd())
    parser.add_argument("--plan", type=Path, help="Production JSON file (or a manifest containing production)")
    parser.add_argument("--builtin", action="store_true", help="Generate a plan for existing Remotion project assets")
    parser.add_argument("--run", action="store_true", help="Execute the plan; default only previews")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, even when --run is supplied")
    parser.add_argument("--restart", action="store_true", help="Run all tasks instead of resuming checkpoints")
    parser.add_argument("--provider", choices=["elevenlabs", "qwen3", "60db"], default="elevenlabs")
    parser.add_argument("--cloud", choices=["modal", "runpod"], default="modal")
    parser.add_argument("--captions", action="store_true", help="Include per-scene caption generation in built-in plan")
    parser.add_argument("--caption-engine", choices=["whisper", "scribe", "auto"], default="whisper")
    parser.add_argument("--json", action="store_true", help="Machine-readable result on stdout")
    args = parser.parse_args(argv)
    try:
        project = args.project.resolve()
        if not project.is_dir():
            raise BuildError(f"Project directory does not exist: {project}")
        plan = load_plan(project, args.plan, builtin=args.builtin, provider=args.provider,
                         cloud=args.cloud, captions=args.captions, caption_engine=args.caption_engine)
        result = (run_build(project, plan, TOOLKIT, restart=args.restart) if args.run and not args.dry_run
                  else plan_build(project, plan, TOOLKIT, restart=args.restart))
    except (BuildError, OSError) as exc:
        result = {"success": False, "error": str(exc)}
        print(json.dumps(result) if args.json else str(exc), file=sys.stdout if args.json else sys.stderr)
        return 2
    if args.json:
        print(json.dumps(result, indent=2))
    elif "tasks" in result:
        for task in result["tasks"]:
            print(f"{task['action']:6} {task['id']}: {task['command']}")
        print("Preview only. Add --run to execute; generation tasks may use paid providers.")
    else:
        print(f"Completed {len(result['completed'])}; resumed {len(result['resumed'])}")
        if result["failed"]:
            print(result["failed"]["error"], file=sys.stderr)
    return 0 if result.get("success", True) else 1


if __name__ == "__main__":
    raise SystemExit(main())
