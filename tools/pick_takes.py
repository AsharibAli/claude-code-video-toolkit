#!/usr/bin/env python3
"""Pick the best take per phrase from several voiceover runs: narration pace first, pitch movement second.

Generate the same scene scripts several times into sibling folders, then let this choose:

    for t in 1 2 3; do cp -r public/audio/phrases public/audio/takes/t$t; \\
        uv run tools/voiceover.py --provider qwen3 --ref-audio REF.wav --ref-text "..." \\
        --scene-dir public/audio/takes/t$t; done
    uv run tools/pick_takes.py --takes-dir public/audio/takes --output public/audio/scenes

Each take folder holds <phrase>.mp3 + <phrase>.txt. A take is scored by its pitch spread (semitones sd,
see voice_prosody.py) minus a pace penalty of one point per 10 wpm outside --pace-min..--pace-max.
The winner is copied to --output with its .txt; a winner still over --max-wpm is slowed with
pitch-preserving atempo, never below --min-tempo. --json writes <output>/takes.json with every
candidate's numbers so a pick can be overruled by hand.

Needs the `prosody` extra: uv sync --extra prosody
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from voice_prosody import measure  # noqa: E402


def duration(f: Path) -> float:
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)]))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--takes-dir", required=True, help="folder of take folders (t1, t2, ...), each with <phrase>.mp3 + .txt")
    ap.add_argument("--output", required=True, help="where the chosen files go")
    ap.add_argument("--pace-min", type=float, default=140)
    ap.add_argument("--pace-max", type=float, default=170)
    ap.add_argument("--max-wpm", type=float, default=170, help="slow a winner faster than this")
    ap.add_argument("--min-tempo", type=float, default=0.9, help="never stretch below this factor")
    ap.add_argument("--json", action="store_true", help="also write <output>/takes.json")
    a = ap.parse_args()

    takes = sorted(p for p in Path(a.takes_dir).iterdir() if p.is_dir() and list(p.glob("*.mp3")))
    if not takes:
        sys.exit(f"no take folders with .mp3 files under {a.takes_dir}")
    out = Path(a.output)
    out.mkdir(parents=True, exist_ok=True)
    phrases = sorted({p.stem for t in takes for p in t.glob("*.mp3")})
    report = {}
    stretched = 0
    for ph in phrases:
        txt = next((t / f"{ph}.txt" for t in takes if (t / f"{ph}.txt").exists()), None)
        text = txt.read_text().strip() if txt else ""
        words = len(text.split())
        cands = []
        for t in takes:
            f = t / f"{ph}.mp3"
            if not f.exists():
                continue
            d = duration(f)
            wpm = words / d * 60 if words else 0
            sd = measure(f)["sd_st"] or 0
            pen = (max(0, wpm - a.pace_max, a.pace_min - wpm) / 10) if words else 0
            cands.append({"take": t.name, "dur": round(d, 2), "wpm": round(wpm), "sd": sd, "score": round(sd - pen, 2)})
        best = max(cands, key=lambda c: c["score"])
        src = Path(a.takes_dir) / best["take"] / f"{ph}.mp3"
        tempo = 1.0
        if words and best["wpm"] > a.max_wpm:
            tempo = max(a.min_tempo, a.max_wpm / best["wpm"])
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", f"atempo={tempo:.4f}", str(out / f"{ph}.mp3")], check=True)
            stretched += 1
        else:
            shutil.copy(src, out / f"{ph}.mp3")
        if txt:
            (out / f"{ph}.txt").write_text(text + "\n")
        final = duration(out / f"{ph}.mp3")
        report[ph] = {"chosen": best["take"], "tempo": round(tempo, 3), "dur": round(final, 2), "frames": round(final * 30),
                      "wpm": round(words / final * 60) if words else None, "sd": best["sd"], "candidates": cands}
        alts = " | ".join(f"{c['take']}:{c['wpm']}wpm/{c['sd']}st" for c in cands)
        print(f"{ph:22} {best['take']:4} {final:6.2f}s {round(final*30):4d}f {report[ph]['wpm'] or '-':>4} wpm  sd {best['sd']:.2f}  tempo {tempo:.2f}   {alts}")
    print(f"{len(phrases)} phrases from {len(takes)} takes -> {out}; {stretched} stretched")
    if a.json:
        (out / "takes.json").write_text(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
