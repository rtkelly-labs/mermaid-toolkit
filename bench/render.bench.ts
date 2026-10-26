import { bench, describe } from 'vitest';
import {
  diffDiagrams,
  enhanceSvgA11y,
  generateDiagramHtml,
  lintMarkdown,
  mermaidToAscii,
  renderSvg,
} from '../src/index';
import { parseMermaid } from '../src/parser';

/** Build a linear flowchart of `n` nodes: A0 --> A1 --> ... */
function linearFlowchart(n: number): string {
  const lines = ['graph LR'];
  for (let i = 0; i < n - 1; i++) {
    lines.push(`  A${i}[Node ${i}] --> A${i + 1}[Node ${i + 1}]`);
  }
  return lines.join('\n');
}

const SMALL = linearFlowchart(3);
const MEDIUM = linearFlowchart(20);
const LARGE = linearFlowchart(100);

const ARCHITECTURE_BEFORE = `flowchart TD
  Client[Web Client] --> Gateway[API Gateway]
  Gateway --> Auth[Auth Service]
  Gateway --> Service[Core Service]
  Service --> Database[(SQL DB)]
`;

const ARCHITECTURE_AFTER = `flowchart TD
  Client[Web Client] --> Gateway[API Gateway]
  Gateway --> Auth[Auth Service]
  Gateway --> Service[Core Service]
  Gateway --> Cache[(Redis Cache)]
  Service --> Database[(PostgreSQL DB)]
`;

const MARKDOWN_DOC = `# System Architecture Overview
Here is the production topology:

\`\`\`mermaid
flowchart LR
  Browser[SPA Frontend] --> CDN[Cloudflare CDN]
  CDN --> Edge[Edge Worker]
  Edge --> API[App Server]
  API --> DB[(Primary Postgres)]
\`\`\`

And the authentication flow:
\`\`\`mermaid
sequenceDiagram
  User ->> Auth: Login request
  Auth -->> User: JWT Token
\`\`\`
`;

describe('parseMermaid', () => {
  bench('small (3 nodes)', () => {
    parseMermaid(SMALL);
  });
  bench('medium (20 nodes)', () => {
    parseMermaid(MEDIUM);
  });
  bench('large (100 nodes)', () => {
    parseMermaid(LARGE);
  });
});

describe('mermaidToAscii (parse + layout + render)', () => {
  bench('small (3 nodes)', () => {
    mermaidToAscii(SMALL);
  });
  bench('medium (20 nodes)', () => {
    mermaidToAscii(MEDIUM);
  });
  bench('large (100 nodes)', () => {
    mermaidToAscii(LARGE);
  });
  bench('ascii-only mode', () => {
    mermaidToAscii(MEDIUM, { asciiOnly: true });
  });
});

describe('renderSvg (Pele SVG rendering)', () => {
  bench('small (3 nodes)', () => {
    renderSvg(SMALL);
  });
  bench('medium (20 nodes)', () => {
    renderSvg(MEDIUM);
  });
  bench('large (100 nodes)', () => {
    renderSvg(LARGE);
  });
  bench('architecture flowchart', () => {
    renderSvg(ARCHITECTURE_AFTER);
  });
});

describe('generateDiagramHtml (MDX AST & Static Pipeline)', () => {
  bench('svg strategy with lightbox', () => {
    generateDiagramHtml(ARCHITECTURE_AFTER, {
      strategy: 'svg',
      className: 'mermaid-diagram',
      fallbackSummary: 'Text diagram',
      onError: 'code',
      lightbox: true,
    });
  });

  bench('dual-output (svg + ascii fallback)', () => {
    generateDiagramHtml(ARCHITECTURE_AFTER, {
      strategy: 'both',
      className: 'mermaid-diagram',
      fallbackSummary: 'Text diagram',
      onError: 'code',
      lightbox: true,
      a11y: true,
    });
  });
});

describe('enhanceSvgA11y (Semantic ARIA Synthesis)', () => {
  const { svg } = renderSvg(ARCHITECTURE_AFTER);

  bench('synthesize a11y tree & descriptions', () => {
    enhanceSvgA11y(svg, ARCHITECTURE_AFTER);
  });
});

describe('diffDiagrams (Topological Visual Diffing)', () => {
  bench('diff before & after architecture', () => {
    diffDiagrams(ARCHITECTURE_BEFORE, ARCHITECTURE_AFTER);
  });
});

describe('lintMarkdown (Static Diagram Linting)', () => {
  bench('lint multi-diagram markdown document', () => {
    lintMarkdown(MARKDOWN_DOC, 'architecture.md');
  });
});
