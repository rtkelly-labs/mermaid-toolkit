# Contributing

## Finding something to work on

Issues are the backlog — there is no separate tracker or board file. Good entry
points:

- [`good first issue`][gfi] — small and well-scoped, with the fix location named
  in the issue body.
- [`help wanted`][hw] — anything the maintainer would happily hand over.
- [`priority:p0`][p0] / [`priority:p1`][p1] — what actually matters right now.

If you're picking up a `type:bug` in the renderer, the issue will already contain
an input diagram plus actual and expected output. Turn that pair into a fixture
under `tests/fixtures/` as part of the fix — that's the convention here, and it's
why the bug template demands those fields.

## Labels

[`.github/labels.yml`](./.github/labels.yml) is the single source of truth for
labels. Editing it on `main` triggers the `Labels` workflow, which syncs GitHub
to match (including deleting labels no longer listed). To apply it immediately
from your machine, run `./scripts/sync-labels.sh` — same idea as
`setup-repo-governance.sh`.

Every issue carries one `type:*`, one `priority:*`, and at least one `area:*`.
Two modifiers matter more than the rest:

| Label | Meaning |
| --- | --- |
| `silent-failure` | Produces wrong output without erroring. The worst bug class in this library — a diagram missing three nodes looks fine and gets committed. These get prioritised above cosmetic breakage. |
| `breaking-change` | Changes public API or rendered output incompatibly. Needs a changelog entry and a minor/major bump. |

## Setup

```bash
pnpm install
```

`pnpm install` also runs `prepare`, which builds `dist/` — the build output is
**not** committed (it is `.gitignore`d and regenerated on install, in CI, and on
publish). Consumers installing this package straight from the Git URL get a
fresh build via the same `prepare` hook.

## Toolchain

| Concern            | Tool                         | Command             |
| ------------------ | ---------------------------- | ------------------- |
| Lint + format      | [Biome]                      | `pnpm lint` / `pnpm format` |
| Types              | TypeScript (`tsc --noEmit`)  | `pnpm typecheck`    |
| Unit tests         | [Vitest]                     | `pnpm test`         |
| Coverage (v8)      | Vitest + `@vitest/coverage-v8` | `pnpm test:coverage` |
| Benchmarks         | Vitest bench                 | `pnpm bench`        |
| Bundle (ESM + CJS + d.ts) | [tsup]                | `pnpm build:check`  |
| Package exports    | [publint] + [are-the-types-wrong] | `pnpm check:exports` |
| Bundle size        | [size-limit]                 | `pnpm size`         |
| Examples smoke     | tsx                          | `pnpm examples`     |

Run the whole gate exactly as CI does:

```bash
pnpm run ci
```

## Layout

- `src/` — the library (theme engine + ASCII renderer). This is the only code
  that ships and the only code measured for coverage.
- `tests/` — Vitest specs (`*.test.ts`) and committed snapshots.
- `bench/` — Vitest benchmarks (`*.bench.ts`), run separately from tests.
- `examples/` — runnable API examples, also used as a CI smoke test.
- `scripts/build.ts` — the versioned release build (`pnpm build`).

Two tsconfigs: `tsconfig.json` typechecks the whole repo (`noEmit`);
`tsconfig.build.json` narrows to `src/` for emit.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main` across Node 20 and
22: lint → typecheck → test+coverage → build → exports validation → size →
examples, plus a benchmark smoke job. Coverage thresholds (80% lines/statements/
functions, 75% branches) are enforced.

Publishing is manual via `.github/workflows/release.yml` (needs an `NPM_TOKEN`
secret; supports a dry-run). It publishes with npm provenance.

[Biome]: https://biomejs.dev
[Vitest]: https://vitest.dev
[tsup]: https://tsup.egoist.dev
[publint]: https://publint.dev
[are-the-types-wrong]: https://github.com/arethetypeswrong/arethetypeswrong.github.io
[size-limit]: https://github.com/ai/size-limit

[gfi]: https://github.com/rtkelly13/mermaid-toolkit/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22
[hw]: https://github.com/rtkelly13/mermaid-toolkit/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22
[p0]: https://github.com/rtkelly13/mermaid-toolkit/issues?q=is%3Aissue+is%3Aopen+label%3Apriority%3Ap0
[p1]: https://github.com/rtkelly13/mermaid-toolkit/issues?q=is%3Aissue+is%3Aopen+label%3Apriority%3Ap1
