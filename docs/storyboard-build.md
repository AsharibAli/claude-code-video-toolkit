# Storyboard build adapter proposal

This connects the responsive storyboard template to the proposed runner. It depends on the manifest, budget/build and responsive-template fork drafts. It does not change the upstream video_job runner or /video.

`uv run tools/storyboard_plan.py --help` describes prop preparation. `uv run tools/build.py --project PATH` previews the generated tasks; execution is explicit with `--run`. Narration and captions reuse existing tools, asset paths stay inside the project, and final rendering uses the selected format and QC.

This is pending upstream #160. Existing provider calls can incur their normal charges if explicitly executed. Tests validate task dependencies, narration-anchored duration and safe output paths without paid inference.
