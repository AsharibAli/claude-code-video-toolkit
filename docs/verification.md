# Verify the separated production proposals

This fork-only harness checks the individual proposals together. It does not
add a CI workflow or imply approval of the manifest/build design in upstream
issue #160. Use Python 3.12+, Node 24, pnpm 12.14, FFmpeg and ffprobe.

Install the optional vision extra for real tracking/compositing tests, then
install the locked Node projects:

```bash
uv sync --extra vision
pnpm --dir playwright install --frozen-lockfile
pnpm --dir templates/storyboard install --frozen-lockfile
pnpm --dir examples/narration-cues install --frozen-lockfile
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chrome/Chromium binary.
If no browser is installed, explicitly install one with
`pnpm --dir playwright exec playwright install chromium`.

```bash
# Python tests and local provider/subtitle/render/QC/recovery checks:
uv run --extra vision python scripts/verify_features.py
# Add actual media, browser actions and the offline capability graph:
uv run --extra vision python scripts/verify_features.py --media --browser --capabilities
```

The full run checks responsive dimensions, a narration-linked still, the
storyboard build adapter through QC, a Spanish variant render, browser action
recording/replay and persisted storyboard review. It uses temporary projects
and small renders. `scratch/feature-verification.json` records only checks that
actually completed. It is a local artifact, not a committed delivery report.

The eleven-task capability graph produces six videos, checks their dimensions,
audio, durations and hashes, runs QC, and proves all eleven tasks resume. Its
fixtures cover speech-aware mixing, speaker slots, highlights, tracking, charts,
evidence, character plans and compositing without paid inference.

FLUX/LTX transport tests use controlled responses. Live conditioning and voice
quality still require provider testing and human review. WhisperX/pyannote and
Demucs inference are not required or exercised by this harness. RVM tests skip
unless the optional matting runtime and a user-supplied official FP32 ONNX model
are configured through `VIDEO_TOOLKIT_RVM_MODEL`. No weights are bundled or
downloaded automatically.

The new Remotion workspaces use patched transitive webpack/Zod versions. The
CLI prints an advisory because its preferred Zod version is older; type checks,
dependency checks and actual rendering exercise the patched combination.
