# Cycling explainer comparison outputs

Claude Code, Codex and OpenCode wrote plans from the same brief. The toolkit rendered them with the same 1080p text scenes, voice and caption settings. The original renders use toolkit commit [`b3437fc`](https://github.com/digitalsamba/claude-code-video-toolkit/commit/b3437fcd462c23b3c46cfd28f8cb61b71039269b).

- [Claude Code and Codex side by side](claude-codex.mp4). The file has two selectable audio tracks.
- [Claude Code](claude-code.mp4), [Codex](codex.mp4) and [OpenCode](opencode.mp4) at full size.
- [Render measurements and checksums](results.json).

The OpenCode run needed a one-line copy edit after preflight. See the discussion in [issue #240](https://github.com/digitalsamba/claude-code-video-toolkit/issues/240).

## Crossfade rerender

The [fixed Claude Code render](claude-crossfade-fixed.mp4) uses the same source assets as the original. The [QC report](crossfade-result.json) records the change from one black gap to zero at the same duration.
