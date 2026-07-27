<!--
Thanks for contributing. Keep this short — the diff is the substance.
Delete any section that doesn't apply.
-->

## What & why

<!-- One or two sentences. Link the issue: "Closes #12". -->

Closes #

## Output change

<!--
For anything touching the parser, renderer, grid or layout, paste the before and
after ASCII for one affected diagram. This is the fastest way to review this
library, and it usually becomes the fixture.

Delete this section for docs/CI-only changes.
-->

<details>
<summary>Before / after</summary>

```
before:


after:

```

</details>

## Checklist

- [ ] `pnpm run ci` passes locally (lint, typecheck, coverage thresholds, build, exports, size)
- [ ] Added or updated a fixture/test that fails without this change
- [ ] Updated the supported-subset table in the README if parser coverage changed
- [ ] No new runtime dependency (or explained below why one is needed)
- [ ] Public API change is noted below and the issue is labelled `breaking-change`

## Notes for the reviewer

<!-- Anything non-obvious: trade-offs taken, cases deliberately left out, follow-ups. -->
