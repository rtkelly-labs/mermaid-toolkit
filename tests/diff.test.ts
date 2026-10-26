import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyDiffClasses,
  diffDiagrams,
  generateDiagramHtml,
  markedMermaid,
  renderDiffDiagram,
  renderSvg,
} from '../src/index';

const BEFORE_FLOWCHART = `flowchart LR
    Client[Client App] --> Auth[Legacy Auth]
    Auth --> Monolith[Monolith Backend]
    Monolith --> MySQL[(MySQL DB)]
`;

const AFTER_FLOWCHART = `flowchart LR
    Client[Client App] --> Gateway[API Gateway]
    Gateway --> Service[Auth Service]
    Gateway --> Core[Core Microservice]
    Core --> Postgres[(PostgreSQL DB)]
`;

describe('Zero-Runtime Visual Diagram Diffing & Changelog Overlays', () => {
  describe('applyDiffClasses', () => {
    it('attaches .pele-diff-* classes to nodes and connected edges', () => {
      const { svg } = renderSvg(AFTER_FLOWCHART);
      const diffed = applyDiffClasses(svg, {
        added: ['Core', 'Postgres'],
        modified: ['Gateway'],
        removed: ['Auth'],
      });

      expect(diffed).toContain(
        'class="pele-node pele-shape-rect pele-diff-added" data-id="Core"',
      );
      expect(diffed).toContain(
        'class="pele-node pele-shape-rect pele-diff-modified" data-id="Gateway"',
      );
      // Edge from Gateway to Core should be marked as added
      expect(diffed).toContain(
        'class="pele-edge pele-diff-added" data-id="L_Gateway_Core_0"',
      );
    });

    it('returns unmodified SVG when diff state is empty', () => {
      const { svg } = renderSvg(AFTER_FLOWCHART);
      expect(applyDiffClasses(svg, {})).toBe(svg);
    });
  });

  describe('diffDiagrams', () => {
    it('computes topological diff between before and after diagrams', () => {
      const result = diffDiagrams(BEFORE_FLOWCHART, AFTER_FLOWCHART);

      expect(result.added).toContain('Gateway');
      expect(result.added).toContain('Service');
      expect(result.added).toContain('Core');
      expect(result.added).toContain('Postgres');

      expect(result.removed).toContain('Auth');
      expect(result.removed).toContain('Monolith');
      expect(result.removed).toContain('MySQL');

      expect(result.unifiedCode).toContain('flowchart LR');
      expect(result.svg).toContain('pele-diff-added');
      expect(result.svg).toContain('pele-diff-removed');
    });

    it('detects modified node labels when IDs match', () => {
      const before = `flowchart LR
    A[Original Label] --> B
`;
      const after = `flowchart LR
    A[Updated Label] --> B
`;
      const result = diffDiagrams(before, after);
      expect(result.modified).toContain('A');
      expect(result.svg).toContain(
        'class="pele-node pele-shape-rect pele-diff-modified" data-id="A"',
      );
    });
  });

  describe('renderDiffDiagram', () => {
    it('returns render result with diff metadata', () => {
      const result = renderDiffDiagram(BEFORE_FLOWCHART, AFTER_FLOWCHART);

      expect(result.type).toBe('flowchart');
      expect(result.svg).toContain('pele-diff-added');
      expect(result.diff.added?.length).toBeGreaterThan(0);
      expect(result.diff.removed?.length).toBeGreaterThan(0);
    });
  });

  describe('themes/diff.css stylesheet', () => {
    it('contains visual cues, colors, and dark mode rules', () => {
      const cssPath = path.resolve(__dirname, '../themes/diff.css');
      expect(fs.existsSync(cssPath)).toBe(true);

      const content = fs.readFileSync(cssPath, 'utf8');
      expect(content).toContain('.pele-diff-added');
      expect(content).toContain('.pele-diff-removed');
      expect(content).toContain('.pele-diff-modified');
      expect(content).toContain('--pele-diff-added');
      expect(content).toContain('--pele-diff-removed');
      expect(content).toContain('--pele-diff-modified');
      expect(content).toContain('stroke-dasharray');
      expect(content).toContain('line-through');
      expect(content).toContain('data-theme="dark"');
    });
  });

  describe('Integration with generateDiagramHtml and markedMermaid', () => {
    it('generateDiagramHtml applies diff classes when diff option is provided', () => {
      const result = generateDiagramHtml(AFTER_FLOWCHART, {
        strategy: 'svg',
        className: 'mermaid-diagram',
        fallbackSummary: 'Text diagram',
        onError: 'code',
        diff: {
          added: ['Core'],
          modified: ['Gateway'],
        },
      });

      expect(result.success).toBe(true);
      expect(result.html).toContain('pele-diff-added');
      expect(result.html).toContain('pele-diff-modified');
    });

    it('markedMermaid extension passes diff option through to SVG', () => {
      const ext = markedMermaid({
        strategy: 'svg',
        diff: {
          added: ['Service'],
        },
      });

      const html = ext.renderer.code({
        text: AFTER_FLOWCHART,
        lang: 'mermaid',
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('pele-diff-added');
      expect(html).toContain('data-id="Service"');
    });
  });
});
