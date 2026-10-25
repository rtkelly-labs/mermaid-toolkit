# Contributing

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
| Bundle (ESM + CJS + d.ts) | [tsup]                | `pnpm build`  |
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
