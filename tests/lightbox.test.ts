import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  generateDiagramHtml,
  markedMermaid,
  rehypeMermaid,
  remarkMermaid,
  renderLightbox,
} from '../src/index';

const SAMPLE_DIAGRAM = `flowchart LR
    A[Start] --> B[Finish]
`;

describe('Zero-JS Lightbox', () => {
  const dummySvg =
    '<svg class="pele" viewBox="0 0 100 50"><text>Diagram</text></svg>';

  describe('renderLightbox', () => {
    it('generates auto / hybrid modal markup by default', () => {
      const { wrapperHtml, id } = renderLightbox(dummySvg, {}, SAMPLE_DIAGRAM);

      expect(id).toMatch(/^pele-lb-[a-z0-9]+$/);
      expect(wrapperHtml).toContain(`popovertarget="${id}"`);
      expect(wrapperHtml).toContain(`href="#${id}"`);
      expect(wrapperHtml).toContain('class="pele-lightbox-toolbar"');
      expect(wrapperHtml).toContain('class="pele-lightbox-trigger"');
      expect(wrapperHtml).toContain(`id="${id}"`);
      expect(wrapperHtml).toContain('class="pele-lightbox"');
      expect(wrapperHtml).toContain('popover="auto"');
      expect(wrapperHtml).toContain('role="dialog"');
      expect(wrapperHtml).toContain('aria-modal="true"');
      expect(wrapperHtml).toContain('class="pele-lightbox-backdrop"');
      expect(wrapperHtml).toContain('class="pele-lightbox-close"');
      expect(wrapperHtml).toContain('Fullscreen diagram');
    });

    it('generates popover-only mode markup', () => {
      const { wrapperHtml, id } = renderLightbox(
        dummySvg,
        { mode: 'popover' },
        'my-custom-id',
      );

      expect(id).toBe('my-custom-id');
      expect(wrapperHtml).toContain(
        '<button type="button" class="pele-lightbox-trigger" popovertarget="my-custom-id"',
      );
      expect(wrapperHtml).toContain(
        '<button type="button" class="pele-lightbox-close" popovertarget="my-custom-id" popovertargetaction="hide"',
      );
      expect(wrapperHtml).not.toContain('pele-lightbox-backdrop');
    });

    it('generates target-only mode markup', () => {
      const { wrapperHtml, id } = renderLightbox(
        dummySvg,
        { mode: 'target' },
        'target-id',
      );

      expect(id).toBe('target-id');
      expect(wrapperHtml).toContain(
        '<a href="#target-id" class="pele-lightbox-trigger"',
      );
      expect(wrapperHtml).not.toContain('popover=');
      expect(wrapperHtml).toContain(
        '<a href="#_" class="pele-lightbox-backdrop"',
      );
      expect(wrapperHtml).toContain('<a href="#_" class="pele-lightbox-close"');
    });

    it('respects custom labels and escapes HTML', () => {
      const { wrapperHtml } = renderLightbox(
        dummySvg,
        {
          triggerLabel: 'Expand <Diagram>',
          dialogLabel: 'Architecture & Flow',
          closeLabel: 'Close & Exit',
        },
        'custom-labels',
      );

      expect(wrapperHtml).toContain('title="Expand &lt;Diagram&gt;"');
      expect(wrapperHtml).toContain('aria-label="Architecture &amp; Flow"');
      expect(wrapperHtml).toContain(
        '<span class="pele-lightbox-title">Architecture &amp; Flow</span>',
      );
      expect(wrapperHtml).toContain('title="Close &amp; Exit"');
    });
  });

  describe('generateDiagramHtml with lightbox', () => {
    it('wraps svg strategy output with lightbox', () => {
      const result = generateDiagramHtml(SAMPLE_DIAGRAM, {
        strategy: 'svg',
        className: 'mermaid-diagram',
        fallbackSummary: 'Text diagram',
        onError: 'code',
        lightbox: true,
      });

      expect(result.success).toBe(true);
      expect(result.html).toContain('pele-has-lightbox');
      expect(result.html).toContain('class="pele-lightbox-toolbar"');
      expect(result.html).toContain('class="pele-lightbox"');
    });

    it('wraps both strategy output with lightbox while keeping ascii fallback', () => {
      const result = generateDiagramHtml(SAMPLE_DIAGRAM, {
        strategy: 'both',
        className: 'mermaid-diagram',
        fallbackSummary: 'Accessible diagram',
        onError: 'code',
        lightbox: { mode: 'popover', idPrefix: 'flow-lb' },
      });

      expect(result.success).toBe(true);
      expect(result.html).toContain('pele-has-lightbox');
      expect(result.html).toContain('flow-lb-');
      expect(result.html).toContain('class="pele-lightbox-toolbar"');
      expect(result.html).toContain('class="pele-ascii-fallback"');
      expect(result.html).toContain('Accessible diagram');
    });
  });

  describe('markedMermaid with lightbox', () => {
    it('renders code token with lightbox toolbar and modal', () => {
      const ext = markedMermaid({
        strategy: 'svg',
        lightbox: true,
      });

      const html = ext.renderer.code({
        text: SAMPLE_DIAGRAM,
        lang: 'mermaid',
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('pele-has-lightbox');
      expect(html).toContain('pele-lightbox-trigger');
      expect(html).toContain('pele-lightbox-dialog');
    });
  });

  describe('remarkMermaid and rehypeMermaid with lightbox', () => {
    it('remarkMermaid transforms node with lightbox enabled', () => {
      const plugin = remarkMermaid({
        strategy: 'svg',
        lightbox: true,
      });

      const tree = {
        type: 'root',
        children: [
          {
            type: 'code',
            lang: 'mermaid',
            value: SAMPLE_DIAGRAM,
          },
        ],
      };

      plugin(tree);
      expect(tree.children[0].type).toBe('html');
      expect((tree.children[0] as { value: string }).value).toContain(
        'pele-has-lightbox',
      );
    });

    it('rehypeMermaid transforms node with lightbox enabled', () => {
      const plugin = rehypeMermaid({
        strategy: 'svg',
        lightbox: true,
      });

      const tree = {
        type: 'root',
        children: [
          {
            type: 'element',
            tagName: 'pre',
            children: [
              {
                type: 'element',
                tagName: 'code',
                properties: { className: ['language-mermaid'] },
                children: [{ type: 'text', value: SAMPLE_DIAGRAM }],
              },
            ],
          },
        ],
      };

      plugin(tree);
      expect(tree.children[0].type).toBe('raw');
      expect(
        (tree.children[0] as unknown as { value: string }).value,
      ).toContain('pele-has-lightbox');
    });
  });

  describe('themes/lightbox.css stylesheet', () => {
    it('exists and contains essential modal and popover rules', () => {
      const cssPath = path.resolve(__dirname, '../themes/lightbox.css');
      expect(fs.existsSync(cssPath)).toBe(true);

      const content = fs.readFileSync(cssPath, 'utf8');
      expect(content).toContain('.pele-has-lightbox');
      expect(content).toContain('.pele-lightbox-toolbar');
      expect(content).toContain('.pele-lightbox-trigger');
      expect(content).toContain('.pele-lightbox:popover-open');
      expect(content).toContain('.pele-lightbox:target');
      expect(content).toContain('.pele-lightbox-backdrop');
      expect(content).toContain('.pele-lightbox-dialog');
      expect(content).toContain('var(--pele-bg');
    });
  });
});
