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

## Automatic highlights

```bash
uv run tools/highlights.py --video recording.mp4 --transcript words.json \
  --seconds 45 --keyword release --output out/highlights.mp4 --save-plan out/edits.json
# Add --run to render. Or replace --transcript with --transcribe --model base.
```

Accepts toolkit Caption[] milliseconds or Whisper/WhisperX `segments` in seconds.
Local Whisper uses the existing optional `whisper` extra. It may download model
weights on first use. No hosted transcription is invoked.

The tool ranks complete punctuated sentences by keyword matches and uncommon
terms, drops near-duplicate takes, selects within the duration budget, and keeps
source order. Long internal pauses are shortened between aligned words. A
segment without word alignment stays intact. An unfinished final sentence is
omitted. This is deterministic first-pass editing; inspect the exported edit
decisions for context and editorial quality. It cannot infer which claims are
interesting or correct. FFmpeg re-encodes cuts to preserve accurate boundaries.

## Subject tracking and reframing

```bash
uv sync --extra vision
uv run tools/reframe.py --video demo.mp4 --box 220,90,180,240 \
  --width 1080 --height 1920 --output out/portrait.mp4 --run
# Or use --faces instead of --box for automatic face detection.
```

CSRT follows the first-frame subject box. Face mode starts with the largest face,
then follows the nearest face; it is not face recognition. Both modes report
temporary losses and fail after `--max-lost` frames. Split footage at scene cuts
or reinitialize with another first-frame box. Neither mode can guarantee identity
through occlusion or reliably recognize the active speaker among several people.

The crop follows the tracked center with smoothing, clamps at image edges, and
preserves the target aspect ratio. `--smoothing 1` follows immediately. The source
must have constant FPS. Original audio is retained. The adjacent `.track.json`
contains frame boxes, loss markers and a source hash for reuse by compositing.
