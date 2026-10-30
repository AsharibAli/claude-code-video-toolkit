# Advanced production capabilities

These tools extend the existing project/build workflow. Commands below run from
the toolkit root. They preview by default; `--run` creates media. Existing files
are protected. Use new output names for revisions.

Approach comparisons and upstream licenses are in
[the research record](advanced-production-research.md).

## Speech-aware audio mixing

```bash
uv run tools/audio_mix.py --video demo.mp4 --speech narration.wav \
  --music music.wav --output out/mixed.mp4
uv run tools/audio_mix.py --video demo.mp4 --speech narration.wav \
  --music music.wav --output out/mixed.mp4 --run
```

Omit `--speech` to use the video's first audio stream. An isolated narration
track gives better results when the original already contains music. Music loops
to the video length. Speech controls a sidechain compressor, so music returns
between phrases. `--threshold`, `--ratio`, `--attack` and `--release` tune this
behavior. Attack/release are milliseconds. Gains are linear, not decibels.

Use `--events effects.json` for timestamped effects. Paths are relative to that
JSON file. Resolve narration phrases with `tools/cues.py`, then use their
`timeMs / 1000` as `atSeconds`.

```json
[{"path":"click.wav","atSeconds":1.25,"gain":0.6}]
```

This uses FFmpeg's sidechaincompress, adelay, amix and limiter filters. It copies
the source video stream and replaces its audio. It does not classify music or
separate voices automatically.
