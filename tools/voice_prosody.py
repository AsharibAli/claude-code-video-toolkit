#!/usr/bin/env python3
"""Measure and reshape voice prosody: pitch spread per file, and a livelier clone reference clip.

A voice clone (Qwen3-TTS, and most reference-audio TTS) copies the reference clip's pace and its
intonation. A flat, fast clip gives flat, fast lines, and slowing the output with atempo only makes
it sound worse. This tool measures the problem and fixes it at the source.

    # Measure: F0 (Praat) at 10 ms, semitones from the median, sd and p5-p95 range
    uv run tools/voice_prosody.py measure assets/voices/lugh-ref.wav public/audio/scenes/*.mp3

    # Expand: pitch deviations ^2.0 around the median and 15% slower (PSOLA resynthesis),
    # keeping the voice and accent. Then clone from the result instead of the original.
    uv run tools/voice_prosody.py expand assets/voices/lugh-ref.wav assets/voices/lugh-ref-expressive.wav \
        --pitch 2.0 --tempo 0.85

Guide values for narration: pitch sd under ~2 st sounds flat, 3-4 st is normal, over ~5 st is
theatrical. A reference measured at 1.7 st gave clones at 1.7-2.1; the same clip expanded 2.0x and
slowed 15% gave clones at 3-4 st and 145-165 wpm with no stretch on the output.

Needs the `prosody` extra: uv sync --extra prosody
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path


def _need_parselmouth():
    try:
        import numpy  # noqa: F401
        import parselmouth  # noqa: F401
    except ImportError:
        sys.exit("praat-parselmouth is not installed:\n    uv sync --extra prosody")


def to_wav16k(path: str | Path) -> str:
    """Mono 16 kHz WAV copy for analysis (works for mp3/mp4/wav inputs)."""
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-vn", "-ac", "1", "-ar", "16000", tmp], check=True)
    return tmp


def measure(path: str | Path, floor: float = 60, ceiling: float = 350) -> dict:
    """Pitch statistics for one file. Semitone values are relative to the file's median F0."""
    _need_parselmouth()
    import numpy as np
    import parselmouth

    snd = parselmouth.Sound(to_wav16k(path))
    pitch = snd.to_pitch(time_step=0.01, pitch_floor=floor, pitch_ceiling=ceiling)
    f0 = pitch.selected_array["frequency"]
    f0 = f0[f0 > 0]
    if len(f0) < 20:
        return {"file": str(path), "median_hz": None, "sd_st": None, "range_st": None, "movement_st_s": None, "voiced_s": 0.0}
    st = 12 * np.log2(f0 / np.median(f0))
    d = np.abs(np.diff(st))
    d = d[d < 3]  # ignore octave jumps and voicing edges
    return {
        "file": str(path),
        "median_hz": round(float(np.median(f0))),
        "sd_st": round(float(st.std()), 2),
        "range_st": round(float(np.percentile(st, 95) - np.percentile(st, 5)), 1),
        "movement_st_s": round(float(d.mean() * 100), 1),
        "voiced_s": round(len(f0) * 0.01, 2),
    }


def label(sd: float | None) -> str:
    if sd is None:
        return "unvoiced"
    return "flat" if sd < 2 else "ok" if sd <= 5 else "theatrical"


def expand(src: str | Path, out: str | Path, pitch: float = 2.0, tempo: float = 0.85, floor: float = 60, ceiling: float = 350) -> dict:
    """Resynthesise `src` with pitch deviations raised to `pitch` around the median and duration scaled by 1/tempo."""
    _need_parselmouth()
    import numpy as np
    import parselmouth
    from parselmouth.praat import call

    snd = parselmouth.Sound(str(src))
    if snd.n_channels > 1:
        snd = snd.convert_to_mono()
    p = snd.to_pitch(time_step=0.01, pitch_floor=floor, pitch_ceiling=ceiling)
    f0 = p.selected_array["frequency"]
    med = float(np.median(f0[f0 > 0]))
    man = call(snd, "To Manipulation", 0.01, floor, ceiling)
    tier = call(man, "Extract pitch tier")
    call(tier, "Formula", f"{med} * (self / {med}) ^ {pitch}")
    call([tier, man], "Replace pitch tier")
    if tempo != 1.0:
        dur = call(man, "Extract duration tier")
        call(dur, "Add point", snd.duration / 2, 1 / tempo)
        call([dur, man], "Replace duration tier")
    res = call(man, "Get resynthesis (overlap-add)")
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    res.save(str(out), "WAV")
    return {"input": str(src), "output": str(out), "median_hz": round(med), "pitch": pitch, "tempo": tempo,
            "duration_s": round(res.duration, 2), "before": measure(src), "after": measure(out)}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    m = sub.add_parser("measure", help="pitch spread per file")
    m.add_argument("files", nargs="+")
    m.add_argument("--json", action="store_true")
    e = sub.add_parser("expand", help="write a livelier, slower copy of a reference clip")
    e.add_argument("input")
    e.add_argument("output")
    e.add_argument("--pitch", type=float, default=2.0, help="exponent on pitch deviations around the median (1 = unchanged; 1.7-2.2 useful)")
    e.add_argument("--tempo", type=float, default=0.85, help="speed factor (0.85 = 15%% slower)")
    e.add_argument("--json", action="store_true")
    for sp in (m, e):
        sp.add_argument("--floor", type=float, default=60, help="pitch floor Hz (60 male, 100 female)")
        sp.add_argument("--ceiling", type=float, default=350, help="pitch ceiling Hz (350 male, 500 female)")
    a = ap.parse_args()

    if a.cmd == "measure":
        rows = [measure(f, a.floor, a.ceiling) for f in a.files]
        for r in rows:
            r["label"] = label(r["sd_st"])
        if a.json:
            print(json.dumps(rows, indent=2))
        else:
            print(f"{'file':44} {'medHz':>5} {'sd(st)':>7} {'p5-p95':>7} {'move/s':>7}  label")
            for r in rows:
                name = r["file"][-44:]
                if r["sd_st"] is None:
                    print(f"{name:44}   (no voiced audio)")
                    continue
                print(f"{name:44} {r['median_hz']:5d} {r['sd_st']:7.2f} {r['range_st']:7.1f} {r['movement_st_s']:7.1f}  {r['label']}")
        return 0

    r = expand(a.input, a.output, a.pitch, a.tempo, a.floor, a.ceiling)
    if a.json:
        print(json.dumps(r, indent=2))
    else:
        b, c = r["before"], r["after"]
        print(f"wrote {r['output']} ({r['duration_s']}s)")
        print(f"  pitch sd {b['sd_st']} -> {c['sd_st']} st, range {b['range_st']} -> {c['range_st']} st, median {r['median_hz']} Hz")
    return 0


if __name__ == "__main__":
    sys.exit(main())
