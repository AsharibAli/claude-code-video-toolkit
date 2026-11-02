# Experimental agent command wrappers

This fork draft separates the agent-facing commands and catalog registration
from their implementation modules. It depends on the individual build, review,
variant and local-contract proposals. Upstream issue #160 must settle the
architecture before these replace or extend an upstream workflow.

`/build-video` validates the requested project and previews tasks, reused outputs
and cost estimates. Execution requires an authorized request and explicit
`--run`. Unknown hosted costs are never treated as free. A failed task or QC
check remains incomplete. Publishing is a separate action.

`/review-video` starts the local storyboard viewer at its actual printed URL.
The user can preview media, leave notes and approve versions. Agents must not
create approvals for unseen content. Edits invalidate content-bound approvals.
Stop the server when the review ends.

The experimental `/video` and `/template` additions point to the proposed
responsive template and validated local contracts. Existing upstream workflows
remain available. Read each template's own instructions and use pnpm for the new
workspace. The optional catalog script registers only tools present on disk and
is idempotent. It does not generate AGENTS.md or delivery reports.

No provider is added by these wrappers. Explicit generation retains the existing
provider's charges and license terms. Registration tests run locally without
inference. Toolkit code is MIT.
