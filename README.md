# @rtkelly/mermaid-toolkit

A lightweight, zero-runtime-overhead toolkit for Mermaid diagrams designed for modern blogs, design systems, and MDX pipelines.

Powered by [Pele](https://pele.run) (`obsidianmd/pele`) for lightning-fast build-time SVG compilation and native CSS variable theming, paired with an ASCII box-drawing layout engine for accessibility and `llms.txt` generation.

## Why this toolkit?

Traditional Mermaid.js rendering in MDX blogs requires shipping a heavy 2–3MB JavaScript runtime to the client browser, causing layout shifts (CLS) and awkward theming hooks.

`@rtkelly/mermaid-toolkit` trims away that runtime overhead:
- **Build-Time Static SVG** — Compiles Mermaid diagrams to raw SVG during static site generation with zero client-side JavaScript.
- **Design System Native** — Styled with native CSS custom properties (`--pele-*`). Diagrams react instantly to dark mode and match your theme tokens without re-rendering JS.
- **MDX & Remark/Rehype Plugins** — Drop-in plugins for Astro, Next.js, Contentlayer, and standard MDX bundlers.
- **Accessible & LLM-Friendly ASCII** — Converts flowcharts into clean Unicode/ASCII art for `<details>` fallbacks, terminal logs, and `llms.txt`.
- **Zero Heavy Dependencies** — No Puppeteer, no JSDOM, no Mermaid.js peer dependency required.

---

## Installation

```bash
pnpm add @rtkelly/mermaid-toolkit
# or
npm install @rtkelly/mermaid-toolkit
```

---

## Quick Start

### 1. Direct Static SVG Rendering

```typescript
import { renderSvg } from "@rtkelly/mermaid-toolkit";

const { svg, width, height } = renderSvg(`
graph LR
  Client[Client App] --> API[Backend API]
  API --> DB[(Database)]
`);

console.log(svg);
// → <svg class="pele pele-flowchart" ... style="--_bg:var(--pele-bg,#fff);...">
```

### 2. MDX / Remark Plugin

Automatically transform ````mermaid ```` code fences in markdown into themeable SVGs with collapsible ASCII fallbacks:

```typescript
// next.config.mjs, astro.config.mjs, or contentlayer.config.ts
import { remarkMermaid } from "@rtkelly/mermaid-toolkit";

export default {
  // ...
  remarkPlugins: [
    [
      remarkMermaid,
      {
        strategy: "both", // 'svg' | 'ascii' | 'both'
        className: "mermaid-diagram",
        fallbackSummary: "Text diagram",
      },
    ],
  ],
};
```

### 3. ASCII / Unicode Text Rendering

```typescript
import { mermaidToAscii } from "@rtkelly/mermaid-toolkit";

const ascii = mermaidToAscii(`
graph LR
  A[Start] --> B[Process]
  B --> C[Finish]
`);

console.log(ascii);
```

**Output:**
```
┌───────┐     ┌─────────┐     ┌────────┐
│ Start ├────►│ Process ├────►│ Finish │
└───────┘     └─────────┘     └────────┘
```

For plain ASCII (no Unicode box-drawing characters), pass `{ asciiOnly: true }`:
```
+-------+     +---------+     +--------+
| Start |---->| Process |---->| Finish |
+-------+     +---------+     +--------+
```

---

## Design System Theming

Pele SVGs map layout colors straight to CSS custom properties. You don't need any JavaScript configuration to theme diagrams—simply style `.pele` or `.mermaid-diagram` with your design system tokens:

```css
/* In your global stylesheet or design system CSS */
.mermaid-diagram,
.pele {
  --pele-bg: var(--color-surface, #ffffff);
  --pele-fg: var(--color-foreground, #111827);
  --pele-line: var(--color-border, #374151);
  --pele-accent: var(--color-primary, #3b82f6);
  --pele-surface: var(--color-surface-subtle, #f3f4f6);
  --pele-border: var(--color-border-subtle, #d1d5db);
  --pele-font: var(--font-sans, system-ui, sans-serif);
  --pele-radius: var(--radius-md, 6px);
}

/* Dark mode switches instantly without re-rendering JS */
[data-theme="dark"] .mermaid-diagram,
[data-theme="dark"] .pele {
  --pele-bg: #1f2937;
  --pele-fg: #f9fafb;
  --pele-line: #9ca3af;
  --pele-surface: #111827;
  --pele-border: #4b5563;
  --pele-accent: #60a5fa;
}
```

---

## API Reference

### `renderSvg(code, options?)`

Compiles Mermaid diagram syntax into an SVG string synchronously.

```typescript
interface RenderSvgOptions {
  className?: string; // Additional class name for root SVG
  id?: string;        // Custom ID attribute
}

interface RenderSvgResult {
  svg: string;        // Full SVG markup
  width: number;      // Intrinsic diagram width
  height: number;     // Intrinsic diagram height
  type: string;       // Diagram type (e.g. 'flowchart')
  mermaidType?: string;
  error?: string;     // Error message if parsing failed
}
```

### `remarkMermaid(options?)`

Remark plugin for Markdown and MDX ASTs.

```typescript
interface RemarkMermaidOptions {
  /**
   * - 'both': Renders static SVG + accessible ASCII fallback (default)
   * - 'svg': Renders only static SVG
   * - 'ascii': Renders only ASCII text diagram
   */
  strategy?: 'svg' | 'ascii' | 'both';

  /** Container class name (default: 'mermaid-diagram') */
  className?: string;

  /** Text for <summary> when strategy is 'both' (default: 'Text diagram') */
  fallbackSummary?: string;

  /** Code block languages to intercept (default: ['mermaid', 'pele']) */
  languages?: string[];

  /** Behavior on error: 'code' (keep block) | 'ascii' | 'error' */
  onError?: 'code' | 'ascii' | 'error';
}
```

### `rehypeMermaid(options?)`

Rehype plugin for HTML AST pipelines that targets `<pre><code class="language-mermaid">`.

```typescript
interface RehypeMermaidOptions {
  strategy?: 'svg' | 'ascii' | 'both';
  className?: string;
  fallbackSummary?: string;
}
```

### `mermaidToAscii(code, options?)`

Generates plain text and Unicode box-drawing diagrams from Mermaid flowcharts.

```typescript
interface AsciiOptions {
  paddingX?: number;      // Horizontal spacing (default: 5)
  paddingY?: number;      // Vertical spacing (default: 5)
  borderPadding?: number; // Text padding inside boxes (default: 1)
  asciiOnly?: boolean;    // Use +, -, | instead of Unicode (default: false)
  showCoords?: boolean;   // Debug coordinates (default: false)
}
```

---

## License

MIT © Ryan Kelly
