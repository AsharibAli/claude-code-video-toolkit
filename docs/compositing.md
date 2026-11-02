# Background replacement and tracked graphics

Fork-only add-on proposal. RVM is optional GPL-3.0 model integration with user-supplied weights; no model is bundled or downloaded. Offline tests cover the ordinary compositing paths.


```bash
uv sync --extra vision
uv run tools/composite.py --foreground presenter.mp4 --background studio.png \
  --key '#00ff00' --output out/virtual-set.mp4 --run
# Replace --key with --alpha mask.mp4 for an existing matte, or:
uv sync --extra vision --extra matting
uv run tools/composite.py --foreground presenter.mp4 --background studio.mp4 \
  --rvm-model /path/to/rvm_mobilenetv3_fp32.onnx --loop-background \
  --output out/matted.mp4 --run
```

Chroma key uses FFmpeg. A supplied mask uses white for opaque, black for
transparent, and gray for soft edges; it must match foreground dimensions and
FPS. A still mask is also supported. RVM uses the official FP32 ONNX model,
processes frames sequentially, and passes its recurrent states into each next
frame. Model weights are never downloaded automatically. Review the upstream
GPL-3.0/model terms linked in the research record. RVM specializes in humans,
not arbitrary object removal. Adjust `--ratio` for detail versus processing cost.

Backgrounds can be still images or videos. They are resized to cover the frame
and cropped centrally. A short video fails unless `--loop-background` is set.
Foregrounds require constant FPS. Their audio is preserved; background audio is
not mixed into the result.

Add `--overlays labels.json --track out/portrait.track.json` to attach transparent
graphics to the boxes from `reframe.py`. The track must belong to the original
foreground video, not the reframed render. Overlay paths are relative to the
overlay spec. Use either `position: [x,y]` or `attachToTrack: true`:

```json
[{"path":"label.png","attachToTrack":true,"offset":[0,-8],
  "size":[160,48],"startSeconds":1,"endSeconds":4}]
```

Attached labels center just above the subject box. Off-frame portions are clipped.
Both held tracking boxes and errors remain visible in the original track report.
