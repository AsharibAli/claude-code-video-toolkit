# Optional dubbing analysis add-on

This fork-only draft preserves the model-dependent part excluded from the
standalone dubbing PR. It is not proposed as an upstream bundled integration.
Use the ordinary import/render commands with supplied labels and stems when
these optional model environments are unavailable.

`diarize` uses an explicitly installed WhisperX/pyannote environment. It requires
`HF_TOKEN` and acceptance of the selected model's access conditions. No token
is supplied by the toolkit. Model loading can download weights:

```bash
python tools/dubbing.py diarize --video input.mp4 --output speakers.json
```

`separate` previews extraction of a background stem. Explicit execution invokes
an installed Demucs environment through its Python executable:

```bash
python tools/dubbing.py separate --video input.mp4 --output background.wav
python tools/dubbing.py separate --video input.mp4 --output background.wav --python /path/to/demucs/python --run
```

WhisperX code is BSD-2-Clause; pyannote.audio and Demucs code are MIT. Model
weights, access and commercial-use conditions are separate. These stacks and
weights are not bundled or installed by this PR. Existing TTS provider costs
still apply if the render command synthesizes replacement voices.

Tests exercise the access guard and prove a stem preview never runs a model.
They do not establish diarization quality or verify real model inference.
