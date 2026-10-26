# Project History: From Slated for Deletion to Zero-Runtime Architecture

> **Document Classification:** Historical Retrospective & Architectural Decision Record  
> **Status:** Active / Foundational  
> **Date:** October 2026  

---

## 1. The Starting Point: Why This Project Was Slated for Deletion

In mid-2026, the repository originally known as `@rtkelly/mermaid-toolkit` had reached a dead end and was actively slated to be archived and deleted.

### The Original Intent
The initial premise was to create a convenience layer for rendering Mermaid diagrams across blogs and personal documentation sites, offering programmatic theming and ASCII fallback generation.

### The Fatal Flaws
In practice, the codebase had accumulated critical architectural liabilities that made ongoing maintenance unsustainable for a solo developer:

1. **The 1,500-Line JavaScript Theme Engine**:
   The library attempted to maintain a massive custom theme engine (`ThemeEngine`, `theme-presets`, `theme-types`) that tried to bridge TypeScript objects into Mermaid's internal `mermaid.initialize()` configurations and `%%{init:...}%%` directives. Theming required executing JavaScript at runtime in the browser, creating flash-of-unstyled-content (FOUC), layout shifts (CLS), and fighting against browser rendering passes.

2. **The Fragile Regex Parser**:
   The parser (`src/parser.ts`) consisted of roughly 30 lines of hand-rolled regular expressions. It attempted to parse Mermaid flowcharts without an AST or formal grammar, silently corrupting or dropping common diagram syntax:
   - Branching and merging graphs resulted in overlapping or misplaced elements.
   - Non-rectangle node shapes (`((circle))`, `[(database)]`, `>flag]`, `{diamond}`) were mishandled.
   - Quoted labels, dotted links (`-.->`), chained edges (`A --> B --> C`), and non-Latin/CJK characters failed or broke layout calculations.

3. **The Contradictory Peer Dependency**:
   The package declared a peer dependency on `mermaid: ^11.0.0` (dragging over 1.6 MB of client-side JavaScript, D3, Elk, and Dagre), while simultaneously claiming to be a "Zero Dependencies — Pure TypeScript implementation." Downstream consumers either had to ship massive bundles to client browsers or wrestle with broken build setups.

4. **The Maintenance Trap**:
   Fixing the ASCII layout engine to support Sugiyama-style layered layouts, while keeping pace with upstream Mermaid.js updates and maintaining client-side theming engines, was an engineering sinkhole. The cost-to-benefit ratio was underwater. The rational choice was simple: **sunset and delete the repository**.

---

## 2. The Turning Point: The Pele Discovery

In late October 2026, during an architectural evaluation for a modern design system and MDX blog pipeline, the project was compared against [Pele](https://pele.run) (`obsidianmd/pele`), authored by Steph Ango (*kepano*) and the Obsidian core team.

Pele demonstrated a fundamentally superior philosophy:
- **Synchronous & Sub-Millisecond**: Compiled Mermaid syntax directly into static SVG in fractions of a millisecond without needing a browser DOM or Puppeteer/Playwright.
- **Zero Runtime Dependencies**: Tiny standalone footprint without dragging hundreds of transitive packages.
- **Native CSS Variable Theming**: Used standard web CSS custom properties (`--pele-*`) rather than JavaScript theme engines. Instant light/dark mode transitions with **zero DOM re-rendering**.

### The Realization
The fatal mistake of the original toolkit was trying to be an **SVG layout and rendering engine**. 

If all Mermaid-to-SVG parsing, layout, and rendering could be delegated entirely to an upstream powerhouse like Pele, the toolkit did not need to be deleted. Instead, it could be radically reimagined into what the modern web truly lacked: **a high-level, zero-runtime static integration toolkit for content systems, design systems, and AI agent pipelines**.

---

## 3. The Radical Pruning (Pull Request #39)

Rather than deleting the repository, a radical refactor was executed in PR #39 (`refactor: adopt pele for static svg rendering, add mdx plugins, and migrate to @rtkelly-labs`):

```
- Deleted 2,365 lines of obsolete theme engine code and tests
- Removed `mermaid` peer dependency (~1.6 MB client bundle eliminated)
- Added `pele` as the foundational upstream compiler
- Reduced core package bundle footprint to < 3.5 kB brotlied
- Codified "Upstream First" policy in AGENTS.md
- Migrated package scope to @rtkelly-labs
```

### The Architectural Policies Put in Stone
In `AGENTS.md`, strict repository laws were established to prevent regression:
1. **Upstream First**: Never write custom SVG layout engines or Mermaid JS wrappers. Delegate directly to Pele.
2. **Minimal Maintenance Surface Area**: Keep the bundle tiny (< 8 kB) and lean.
3. **Design System Native**: Theming belongs exclusively in native CSS variables (`--pele-*`). Zero JavaScript runtime.
4. **Static SSR First**: 0 KB client-side JavaScript. Pre-compile everything at build time.
5. **Accessible Dual-Output**: Retain lightweight Unicode/ASCII box-drawing diagrams for screen readers, terminal logs, and `llms.txt`.

---

## 4. The Second Life: Building the Definitive Zero-Runtime Pipeline

With the maintenance burden offloaded to Pele, the toolkit quickly expanded into a cohesive, production-grade suite of capabilities that no other tool in the ecosystem provides:

| Feature | Problem Solved | Implementation |
| :--- | :--- | :--- |
| **MDX & AST Plugins** | Seamless build-time diagram compilation for Astro, Next.js, and Vite | `remarkMermaid`, `rehypeMermaid`, `markedMermaid` with 0 KB client JS |
| **CSS Theme Presets** | Instant drop-in styling matching modern design systems (Tailwind, Catppuccin, Nord, Brutalist) | `./themes/*` export map with pure CSS tokens |
| **Semantic Accessibility** | Diagrams historically were opaque visual black boxes for assistive tech | Automated synthesis of `aria-describedby`, `<title>`, `<desc>`, and topological ASCII summaries |
| **Agentic Documentation** | LLMs and web agents cannot parse raw SVGs when scraping documentation | Turnkey `llms.txt` and `llms-full.txt` pipeline embedding ASCII flowcharts |
| **Zero-JS Lightbox & Links** | Viewing large diagrams in mobile docs required bulky JS modal libraries | Pure HTML5 `:target` modal overlay and native SPA router link preservation (`data-router-link`) |
| **Build-Time Linter CLI** | Broken Mermaid syntax slipped into production or broke CI unexpectedly | `mermaid-lint` CLI with line-level diagnostics, stylish output, and JSON reporting |
| **Headless OG Card Generator** | Social preview cards required spinning up Chromium in CI | Fast serverless OpenGraph rasterization via `@rtkelly-labs/mermaid-toolkit/og` and `resvg` |
| **Visual Diagram Diffing** | Architecture docs and ADRs had no way to display migration changelogs visually | `diffDiagrams()` and `themes/diff.css` using Pele's deterministic `data-id` attributes |

---

## 5. Current Standing & Quality Metrics

Today, what was nearly discarded is one of the cleanest, highest-velocity packages in the ecosystem:
- **220 Automated Tests**: Exhaustive coverage across 16 test suites, including a 67-diagram golden fixture corpus.
- **Strict Quality Gates**: 100% clean Biome lint/format, zero TypeScript compiler errors, automated Dependabot maintenance, and verified exports (`publint` + `attw`).
- **Tiny Bundle**: ~7.1 kB minified and brotlied with all features included.
- **Zero Headless Browsers**: Zero Puppeteer, zero Playwright, sub-millisecond build speeds.

## 6. The Core Takeaway

> *"A project with an untenable maintenance surface is often not a bad idea—it is merely doing the wrong things at the wrong layer."*

By refusing to reinvent low-level layout algorithms and instead doubling down on developer ergonomics, accessibility, design tokens, and static SSR, `@rtkelly-labs/mermaid-toolkit` turned a slated deletion into a foundational asset.
