# Contributing

Thank you for your interest in contributing to **mermaid-toolkit**! We welcome bug reports, feature suggestions, documentation improvements, and code contributions.

---

## Code of Conduct

All contributors and maintainers are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md) in all interactions.

---

## Setup

```bash
pnpm install
```

`pnpm install` also runs `prepare`, which builds `dist/` — the build output is
**not** committed (it is `.gitignore`d and regenerated on install, in CI, and on
publish). Consumers installing this package straight from the Git URL get a
fresh build via the same `prepare` hook.

## Toolchain

| Concern | Tool | Command |
| ------- | ---- | ------- |
| Lint + format | [Biome](https://biomejs.dev) | `pnpm lint` / `pnpm format` |
| Types | TypeScript (`tsc --noEmit`) | `pnpm typecheck` |
| Unit tests | [Vitest](https://vitest.dev) | `pnpm test` |
| Coverage (v8) | Vitest + `@vitest/coverage-v8` | `pnpm test:coverage` |
| Benchmarks | Vitest bench | `pnpm bench` |
| Bundle (ESM + CJS + d.ts) | [tsup](https://tsup.egoist.dev) | `pnpm build` |
| Package exports | [publint](https://publint.dev) + [are-the-types-wrong](https://github.com/arethetypeswrong/arethetypeswrong.github.io) | `pnpm check:exports` |
| Bundle size | [size-limit](https://github.com/ai/size-limit) | `pnpm size` |
| Examples smoke | tsx | `pnpm examples` |

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

Two tsconfigs: `tsconfig.json` typechecks the whole repo (`noEmit`);
`tsconfig.build.json` narrows to `src/` for emit.

## CI

`.github/workflows/ci.yml` runs on every push/PR to `main` across Node 20 and
22: lint → typecheck → test+coverage → build → exports validation → size →
examples, plus a benchmark smoke job. Coverage thresholds (80% lines/statements/
functions, 75% branches) are enforced.

Publishing is manual via `.github/workflows/release.yml` (needs an `NPM_TOKEN`
secret; supports a dry-run). It publishes with npm provenance.

---

## Development Workflow

1. **Fork or Branch**:
   - Create a feature or bugfix branch using clear naming:
     - `feat/<feature-name>`
     - `fix/<bug-description>`
     - `docs/<doc-update>`
     - `chore/<maintenance-task>`

2. **Linear History & Rebase**:
   - We enforce a strictly linear history on `main`.
   - Before opening a PR or marking it ready for review, rebase your branch on latest `main`:
     ```bash
     git fetch origin
     git rebase origin/main
     ```

3. **Pull Requests**:
   - Fill out the PR template completely with linked issues and verification steps.
   - All pull requests are merged exclusively via **Squash and Merge**.

---

## Reporting Issues

- **Bug Reports**: Please use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml) form. Provide exact reproduction steps and system versions.
- **Feature Requests**: Please use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml) form.
