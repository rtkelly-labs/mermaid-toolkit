# Gap analysis: what's missing to be a fully-fledged open-source repo

Audit date: 2026-07-27, against `ea70bea`.

The build/CI/packaging layer of this repo is genuinely strong — better than most
solo projects at this stage. `pnpm run ci` is a real gate (lint → typecheck →
coverage-with-thresholds → dual-format build → `publint`/`attw` → size-limit →
examples smoke), plus a tarball consumer-install check for both ESM and CJS, and
a documented branch-ruleset script. Coverage is **91.7% statements / 82% branches**
with 64 passing tests. None of that is the gap.

The gaps are in three places: a **legally broken LICENSE**, a **README that
describes a library that doesn't exist yet**, and an **ASCII renderer that
silently corrupts or drops most real diagrams**. Ranked by what would embarrass
the project if a stranger starred it tomorrow.

---

## Tier 0 — blockers, fix before any promotion

### 0.1 `LICENSE` is not a license

The file contains four bytes: `MIT`. It is not the MIT licence text, has no
copyright line, and no year. `package.json` says `"license": "MIT"` and the README
says `MIT © Ryan Kelly`, so the *intent* is clear — but the repo currently ships
no grant of rights. GitHub won't detect it, `npm` metadata is unverifiable, and
corporate legal review would block adoption outright.

**Fix:** drop in the full MIT text with `Copyright (c) 2026 Ryan Kelly`. Single
highest-value change in this document.

### 0.2 The install instructions don't work — the package isn't on npm

`https://registry.npmjs.org/@rtkelly/mermaid-toolkit` → **404**. The README opens
with `npm install @rtkelly/mermaid-toolkit mermaid`, which fails for every reader.
`version` is still `0.0.1` while the README's roadmap says "v1.0 (Current)".

**Fix:** either publish `0.1.0` via the existing (already-good) `release.yml`, or
change the install section to the Git-URL install that actually works today and
mark the package pre-release. Don't leave instructions that 404.

### 0.3 `mermaid` is a peer dependency that is never used

`grep` for `from 'mermaid'` across `src/`, `tests/`, `examples/` returns nothing.
The parser in `src/parser.ts` is ~30 lines of hand-rolled regex. Yet:

- `package.json` declares `mermaid: ^11.0.0` as a peer dep,
- the README's install block tells users to install it,
- the README says *"Uses [mermaid](https://mermaid.js.org/) for parsing"*,
- the README says *"**Parse** — Use Mermaid's parser to understand syntax"*,
- and simultaneously claims *"Zero Dependencies — Pure TypeScript implementation"*.

These four statements cannot all be true. This is the most misleading thing in
the repo: it advertises Mermaid-grade parsing fidelity and delivers regex.

**Fix:** pick a lane and say so.
- *Honest-regex lane:* drop the peer dep, delete the "uses Mermaid's parser"
  claims, and document the supported subset explicitly (see 2.1).
- *Real-parser lane:* actually import `mermaid`'s parser and keep the peer dep.

The regex lane is defensible — a zero-dep, sync, Node-and-browser parser with no
DOM requirement is a genuine selling point that Mermaid's own parser can't offer.
But it has to be sold as a subset, not as parity.

---

## Tier 1 — correctness: the renderer fails on ordinary diagrams

All of the following were reproduced against `src/` at `ea70bea` with
`mermaidToAscii(code, { asciiOnly: true })`. The unifying problem is
`src/renderers/flowchart.ts`: `layoutHorizontal`/`layoutVertical` place nodes in a
**single row or column in declaration order** and then draw straight lines between
them. There is no graph layout — no ranking, no branch handling, no collision
avoidance. Edges that aren't between declaration-adjacent nodes are drawn straight
through whatever boxes lie between.

### 1.1 Any branching graph is corrupted

```
graph LR
  A[Start] --> B[Left]
  A --> C[Right]
```
```
+-------+     +------+     +-------+
| Start |----->-Left-|-----> Right |
+-------+     +------+     +-------+
```

The `A --> C` edge is drawn horizontally *through* box `B`, overwriting its left
border, its label, and its right border (`>-Left-|`). Branching is the single most
common flowchart shape; it produces garbage. In `TD` the same graph renders as a
straight chain `Start → Left → Right`, which is a **different diagram** than the
one the user wrote — silently wrong rather than visibly broken.

### 1.2 Merges lose their arrowheads and imply the wrong direction

```
graph TD
  A[A] --> C[C]
  B[B] --> C
```
renders `A ↓ C ↓ B` with the `B --> C` edge drawn as a plain line from `C` down to
`B` and **no arrowhead** — reading as `C → B`, the reverse of the input.

### 1.3 Every non-rectangle node shape is silently dropped

The edge regex is
`/(\w+)(?:\[([^\]]+)\])?\s*(-->|---|-\.-|==>)\s*(?:\|([^|]+)\|)?\s*(\w+)(?:\[([^\]]+)\])?/`
— only `[square]` labels. Anything else fails the match, and the *whole line* is
discarded, taking both nodes and the edge with it:

| Input | Rendered | Expected |
| --- | --- | --- |
| `A{Decide} --> B[Yes]` | only `Yes` | both + edge |
| `A(Round) --> B[Sq]` | only `Sq` | both + edge |
| `A([Stadium]) --> B[Sq]` | only `Sq` | both + edge |
| `A((Circle)) --> B[Sq]` | only `Sq` | both + edge |

No warning, no error — nodes just vanish. Decision diamonds are ubiquitous in
flowcharts, so in practice most real diagrams lose content.

### 1.4 Chained edges drop everything after the first hop

`A[One] --> B[Two] --> C[Three]` renders `One → Two`. `C` is gone. The regex is
not applied repeatedly across the line.

### 1.5 `-.->` (dotted arrow) is unsupported and drops the line

The alternation has `-.-` but not `-.->`. `A[A] -.-> B[B]` renders `A` alone —
`B` and the edge are lost. `-.text.->` likewise. `-.->` is the common spelling.

### 1.6 Edge *styles* are parsed then ignored

`type: 'dotted' | 'thick' | 'solid'` is populated by the parser and never read by
the renderer. `-.-`, `==>`, `---` and `-->` all render as an identical
`----->` solid arrow. `---` shouldn't have an arrowhead at all.

### 1.7 `RL` and `BT` directions are parsed and ignored

`flowchart.ts:21` treats `RL` exactly as `LR` and `BT` exactly as `TD`; edges
always point right/down. `graph RL; A-->B` renders byte-identical to `graph LR`.
The README's support table claims **"Flowchart (LR/RL) ✅ Supported"** and
**"(TD/BT) ✅ Supported"** — half of that is untrue.

### 1.8 Self-loops and cycles corrupt box borders

`A[A] --> A` renders `>-A-|`: the arrowhead is written on top of the box's own
border. Any cycle (`A-->B; B-->A`) corrupts both boxes.

### 1.9 CJK / wide / combining characters misalign every box

Box width is computed from `label.length` (UTF-16 code units), not display width:

```
+---------+     +---+
| 日本語テキスト |-----> B |
+---------+     +---+
```

7 code units, 14 display columns → the border is 7 columns short. Same class of
bug for emoji, combining accents, and any astral-plane character. For a library
whose entire output is monospace text alignment, a `wcwidth`-style width function
is table stakes.

### 1.10 Quoted labels aren't unquoted, and brackets inside them truncate

`A["Label [x]"]` → `| "Label [x |`. The `[^\]]+` capture stops at the first `]`
and the surrounding quotes are kept as literal content. Mermaid uses quoting
precisely to allow these characters.

### 1.11 Long edge labels are drawn outside the grid and eat the box

`A[A] -->|this is a really long edge label| B[B]`:

```
this is a really long edge label
         | A |-----> B |
         +---+     +---+
```

The label is centred by `label.length / 2`, goes negative, and the top border of
box `A` is destroyed. No clamping and no collision check in
`drawHorizontalEdge`/`drawVerticalEdge`.

### 1.12 `subgraph` is not supported and degrades into nonsense

The `subgraph S[Group]` header is parsed as a *node* named `Group`, `end` is
ignored, and members are laid out as if top-level — yielding a floating `Group`
box, a large blank gap, then the chain. Subgraphs should be supported or
explicitly rejected with a clear error.

### 1.13 Empty and unparseable-but-detected input returns empty string

`graph LR` with no body returns `""` — no diagram, no error, no signal. By
contrast an unknown diagram type returns a nicely formatted `[ASCII RENDER ERROR]`
block. The silent-empty path should use the same error channel.

### 1.14 There is no strict/diagnostics mode

Every failure above is silent. For a tool whose main job is generating docs and
`llms.txt` in build pipelines, the dangerous outcome isn't a crash — it's a
*plausible-looking diagram missing three nodes* getting committed. The library
needs either `strict: true` (throw on unsupported syntax) or a
`{ ascii, warnings[] }` result shape, so CI can fail on silent drops.

**Note on coverage:** 91.7% coverage coexists with all of the above because the
tests assert on the happy path (linear `A --> B --> C` chains, snapshot of a
known-good render). High coverage is measuring that the code runs, not that the
output is correct. Property/fuzz tests over generated diagrams, plus fixtures for
each case above, would close this — `tests/fixtures/` is currently an empty
directory with a README reserving it for exactly this.

---

## Tier 2 — documentation honesty

### 2.1 No documented "supported subset"

Given a regex parser, the most important doc is a precise statement of what
parses. Right now the support table lists diagram *types* only, so users
reasonably assume full flowchart syntax within `graph LR`. There should be an
explicit table: shapes (`[]` only), arrows (`-->`, `---`, `-.-`, `==>`), one edge
per line, `\w+` ids only, no subgraphs, no `classDef`/`style`, no chaining,
no `&` multi-node, no `%%{init}%%` passthrough.

### 2.2 README contains stale monorepo residue

This repo was extracted from `rtkelly13/blog` and the seams show:

- *"This package is part of [Ryan Kelly's blog]"* — it's a standalone repo now.
- `See [AGENTS.md](../../AGENTS.md)` — **broken link**, points outside the repo,
  and `CONTRIBUTING.md` (which is good and repo-local) is never linked from the
  README.
- The "Package Structure" tree is rooted at `packages/mermaid-toolkit/` — a path
  that doesn't exist here — and omits `bench/`, `examples/`, `scripts/`.
- *"Run test suite (when available)"* and the v1.1 roadmap item
  *"Comprehensive test suite (vitest)"* — there are 64 passing tests with
  enforced thresholds. The repo undersells its own best feature.

### 2.3 Roadmap and version disagree with reality

"v1.0 (Current)" vs `version: 0.0.1`; "1000+ example diagram collection" as a
v1.1 goal is an odd public promise. Recommend collapsing to a short
`## Status: early / pre-1.0` note plus a link to GitHub issues, and letting
milestones live in the issue tracker rather than the README.

### 2.4 No badges, no changelog

No CI / coverage / npm / licence badges, so a visitor can't see at a glance that
CI is green — again underselling the strongest part of the repo. And no
`CHANGELOG.md`: with a manual `workflow_dispatch` release, nothing records what
changed between versions. Either hand-maintain a Keep-a-Changelog file or adopt
Changesets (which also automates the version bump the `release.yml` currently
leaves manual).

### 2.5 `cli` keyword but no CLI

`package.json` lists `"cli"` and `"llms.txt"` as keywords and the README pitches
terminal use and `llms.txt` generation, but there is no `bin` entry. The
`llms.txt` use case is currently a copy-paste regex snippet in the README. A
`mermaid-toolkit` binary (`... render diagram.mmd`, `... llms-txt ./content`)
would turn the two headline use cases into one install, and is a natural
first-contributor issue.

---

## Tier 3 — community-health scaffolding (all absent)

Every one of these is missing:

| File | Why it matters |
| --- | --- |
| `CODE_OF_CONDUCT.md` | GitHub community-standards checklist; expected for contributions |
| `SECURITY.md` | Where to report vulns privately; enables private advisories |
| `.github/ISSUE_TEMPLATE/` | Bug reports for a *renderer* need the input diagram + expected output — a template makes issues actionable. High leverage here. |
| `.github/PULL_REQUEST_TEMPLATE.md` | Nudge toward "added a fixture + updated the support table" |
| `.github/dependabot.yml` or `renovate.json` | Nothing currently updates deps or actions; `actions/checkout@v4` etc. will silently rot |
| `.github/CODEOWNERS` | Auto-review assignment |
| `.github/FUNDING.yml` | Optional, one line |
| `.editorconfig` | Biome covers this repo's files; editors of contributors' other files won't match |
| `.nvmrc` / `.node-version` | CI pins 20/22, local dev pins nothing |
| `CONTRIBUTING.md` link from README | The file is good — nobody will find it |

Note `CONTRIBUTING.md` and `.github/repo-governance.md` are both genuinely
well-written; the gap is discoverability and the surrounding files, not quality.

### Also missing on the CI side

- **No CodeQL / no `zizmor`-style workflow lint.** `permissions` are correctly
  scoped and there's no `pull_request_target`, so the posture is fine — but
  nothing enforces that going forward.
- **No OpenSSF Scorecard**, which is the cheapest external signal of the hygiene
  this repo mostly already has.
- **Coverage artifact is uploaded but never reported.** No Codecov/Coveralls step,
  so PRs don't show coverage deltas.
- **No published API docs.** 50+ typed theme variables and the README's
  hand-maintained API block will drift. TypeDoc → GitHub Pages, or a
  Docusaurus/Astro site with *live* Mermaid renders next to their ASCII
  equivalents, would be the single best marketing asset — the library's output is
  inherently visual and there is currently nowhere to see it.
- **No visual regression / golden-file corpus.** `tests/fixtures/` is empty. A
  directory of `.mmd` → `.txt` golden pairs is the natural test strategy for this
  library and makes contributions safe.
- **Single entrypoint.** Theme engine and ASCII renderer are independent; someone
  wanting only theming still pays for the renderer. `./theme` and `./ascii`
  subpath exports would fix that (bundle is small, so this is low priority).
- **No `provenance` verification note / no release automation.** `release.yml` is
  manual `workflow_dispatch` with no tag creation, no GitHub Release, no changelog
  generation. Tag-triggered release + Changesets would close this.

---

## Recommended order

**Week 1 — stop the bleeding (all small):**
1. Real MIT text in `LICENSE` (0.1)
2. Resolve the `mermaid` peer-dep contradiction; document the supported subset (0.3, 2.1)
3. Fix the stale README: broken `AGENTS.md` link, monorepo paths, "tests when
   available", roadmap/version mismatch; add badges (2.2, 2.3, 2.4)
4. Correct the support table so it no longer claims RL/BT work (1.7)
5. `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue/PR templates, `dependabot.yml`,
   `.nvmrc` (Tier 3)

**Week 2 — make the renderer trustworthy:**
6. Add `strict`/`warnings` so nothing fails silently (1.14) — do this *first*, it
   turns every bug below into a visible, testable event
7. Golden-fixture corpus in `tests/fixtures/`, one per Tier-1 case (1.1–1.13)
8. Rewrite the parser: all node shapes, edge chaining, `-.->`, quoted labels,
   multi-char ids (1.3, 1.4, 1.5, 1.10)
9. Display-width-aware box sizing (1.9)

**Week 3+ — the real work:**
10. Replace single-row layout with an actual layered/Sugiyama-style layout so
    branches, merges and cycles render correctly (1.1, 1.2, 1.8) — this is the
    substantial engineering item and the one that decides whether the ASCII
    renderer is a toy or a tool
11. Honour edge styles (1.6); subgraph support (1.12)
12. Publish to npm (0.2); Changesets + tag-triggered release; docs site with
    side-by-side renders
13. CLI binary for the `llms.txt` / terminal use cases (2.5)

---

## Summary

The scaffolding a solo maintainer usually skips is *already done here and done
well*. What's missing is the part a stranger sees first — a valid licence, a
README that matches the code, an install command that resolves — and the part a
stranger hits second: a renderer that quietly mangles any diagram with a branch,
a diamond, a dotted arrow, or a non-Latin label. Tier 0 and Tier 2 are a
weekend. Tier 1.10 (layout) is the project's actual roadmap.
