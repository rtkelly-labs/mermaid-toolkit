import { describe, expect, it } from 'vitest';
import {
  enhanceSvgA11y,
  generateDiagramHtml,
  markedMermaid,
  remarkMermaid,
  synthesizeDiagramDescription,
} from '../src/index';

const SAMPLE_FLOWCHART = `flowchart LR
    Client[Client App] -->|HTTPS| Edge[Edge Gateway]
    Edge -->|gRPC| Core[Core Service]
    Core --> DB[(PostgreSQL)]
`;

const SAMPLE_SEQUENCE = `sequenceDiagram
    Alice->>Bob: Hello Bob
    Bob-->>Alice: Hi Alice!
`;

describe('Automated Semantic Accessibility (ARIA) Synthesis', () => {
  describe('synthesizeDiagramDescription', () => {
    it('synthesizes rich topological description for flowcharts', () => {
      const { title, description } =
        synthesizeDiagramDescription(SAMPLE_FLOWCHART);

      expect(title).toContain('Flowchart (LR)');
      expect(title).toContain('4 nodes');

      expect(description).toContain("Starts at 'Client App'");
      expect(description).toContain(
        "'Client App' connects to 'Edge Gateway' via \"HTTPS\"",
      );
      expect(description).toContain(
        "'Edge Gateway' connects to 'Core Service' via \"gRPC\"",
      );
      expect(description).toContain("Terminates at 'PostgreSQL'");
    });

    it('synthesizes ordered message exchanges for sequence diagrams', () => {
      const { title, description } =
        synthesizeDiagramDescription(SAMPLE_SEQUENCE);

      expect(title).toContain('Sequence diagram with 2 participants');
      expect(description).toContain("'Alice' and 'Bob'");
      expect(description).toContain(
        "Step 1: 'Alice' sends \"Hello Bob\" to 'Bob'",
      );
      expect(description).toContain(
        "Step 2: 'Bob' sends \"Hi Alice!\" to 'Alice'",
      );
    });

    it('respects custom overrides', () => {
      const { title, description } = synthesizeDiagramDescription(
        SAMPLE_FLOWCHART,
        {
          title: 'Custom High-Level Architecture',
          description: 'Custom description for screen readers.',
        },
      );

      expect(title).toBe('Custom High-Level Architecture');
      expect(description).toBe('Custom description for screen readers.');
    });
  });

  describe('enhanceSvgA11y', () => {
    const dummySvg =
      '<svg xmlns="http://www.w3.org/2000/svg" class="pele" viewBox="0 0 100 50"><text>Content</text></svg>';

    it('injects <title>, <desc>, aria-labelledby, and aria-describedby into SVG', () => {
      const enhanced = enhanceSvgA11y(dummySvg, SAMPLE_FLOWCHART);

      expect(enhanced).toContain('aria-labelledby="pele-a11y-title-');
      expect(enhanced).toContain('aria-describedby="pele-a11y-desc-');
      expect(enhanced).toContain('<title id="pele-a11y-title-');
      expect(enhanced).toContain('<desc id="pele-a11y-desc-');
      expect(enhanced).toContain('Flowchart (LR)');
    });

    it('returns unmodified SVG when enabled is false', () => {
      const enhanced = enhanceSvgA11y(dummySvg, SAMPLE_FLOWCHART, {
        enabled: false,
      });

      expect(enhanced).toBe(dummySvg);
      expect(enhanced).not.toContain('<title');
      expect(enhanced).not.toContain('<desc');
    });

    it('properly escapes XML special characters in title and description', () => {
      const enhanced = enhanceSvgA11y(dummySvg, SAMPLE_FLOWCHART, {
        title: 'Safety <Critical> & Secure',
        description: 'Flow with "quotes" and <tags>',
      });

      expect(enhanced).toContain('Safety &lt;Critical&gt; &amp; Secure');
      expect(enhanced).toContain(
        'Flow with &quot;quotes&quot; and &lt;tags&gt;',
      );
    });
  });

  describe('Integration with generateDiagramHtml, markedMermaid, and remarkMermaid', () => {
    it('automatically generates accessible SVGs with ARIA metadata out of the box', () => {
      const result = generateDiagramHtml(SAMPLE_FLOWCHART, {
        strategy: 'svg',
        className: 'mermaid-diagram',
        fallbackSummary: 'Text diagram',
        onError: 'code',
      });

      expect(result.success).toBe(true);
      expect(result.html).toContain('aria-labelledby="pele-a11y-title-');
      expect(result.html).toContain('aria-describedby="pele-a11y-desc-');
      expect(result.html).toContain('<title id=');
      expect(result.html).toContain('<desc id=');
    });

    it('can be disabled via a11y: false option', () => {
      const result = generateDiagramHtml(SAMPLE_FLOWCHART, {
        strategy: 'svg',
        className: 'mermaid-diagram',
        fallbackSummary: 'Text diagram',
        onError: 'code',
        a11y: false,
      });

      expect(result.success).toBe(true);
      expect(result.html).not.toContain('aria-labelledby="pele-a11y-title-');
      expect(result.html).not.toContain('<desc id=');
    });

    it('works seamlessly in markedMermaid extension', () => {
      const ext = markedMermaid({
        strategy: 'svg',
        a11y: {
          title: 'Marked Architectural Flow',
        },
      });

      const html = ext.renderer.code({
        text: SAMPLE_FLOWCHART,
        lang: 'mermaid',
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('Marked Architectural Flow');
      expect(html).toContain('aria-labelledby="pele-a11y-title-');
    });

    it('works seamlessly in remarkMermaid plugin', () => {
      const plugin = remarkMermaid({
        strategy: 'svg',
      });

      const tree = {
        type: 'root',
        children: [
          {
            type: 'code',
            lang: 'mermaid',
            value: SAMPLE_FLOWCHART,
          },
        ],
      };

      plugin(tree);
      expect(tree.children[0].type).toBe('html');
      const val = (tree.children[0] as { value: string }).value;
      expect(val).toContain('aria-labelledby="pele-a11y-title-');
      expect(val).toContain('<desc id=');
    });
  });
});
