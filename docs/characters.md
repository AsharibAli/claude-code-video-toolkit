# Character consistency across shots

Define stable appearance, wardrobe, visual style and reference images in a
project-relative character spec:

```json
{"version":1,"seed":42,"style":"Soft daylight, watercolor",
 "characters":{"lea":{"description":"Short brown hair, round glasses",
   "wardrobe":"Blue jacket","references":["public/lea.png"]}},
 "shots":[{"id":"intro","characters":["lea"],"prompt":"Standing in a studio",
   "motionPrompt":"A small wave","imageCostUsd":0.05,"videoCostUsd":0.2}]}
```

```bash
uv run tools/characters.py lock --project projects/story --spec characters.json \
  --output projects/story/lookbook.lock.json
uv run tools/characters.py plan --project projects/story \
  --lock projects/story/lookbook.lock.json --save-plan projects/story/shots.plan.json
uv run tools/build.py --project projects/story --plan projects/story/shots.plan.json --json
# Add --run and an appropriate --budget-usd only when ready to call configured endpoints.
```

The lock records reference hashes and deterministic shot seeds. Changed images
require a new reviewed lock. FLUX receives the original character references for
every shot, with the same appearance/style constraints. An optional motion prompt
adds an LTX image-to-video task that depends on that shot's still. The current
FLUX endpoint accepts up to three references in total per shot. LTX uses Modal;
`--cloud` selects the FLUX provider. Asset history records generated outputs.

This conditions generation; it does not guarantee identity or prevent model
artifacts. Inspect each shot. Estimates are supplied by you, not provider quotes.
Unknown estimates block capped builds. Use a new `--output-dir` for revisions so
old generated assets stay intact. Preview and lock creation do not call providers.
