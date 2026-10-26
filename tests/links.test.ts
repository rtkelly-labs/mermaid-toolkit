import { describe, expect, it } from 'vitest';
import {
  enhanceSvgLinks,
  generateDiagramHtml,
  markedMermaid,
} from '../src/index';

const SAMPLE_LINK_SVG = `<svg class="pele" viewBox="0 0 200 100">
  <g class="pele-nodes">
    <g class="pele-node clickable">
      <a href="/docs/guide" target="_self"><title>Guide</title><rect width="50" height="20"/></a>
    </g>
    <g class="pele-node clickable">
      <a href="https://example.com/external"><title>External</title><rect width="50" height="20"/></a>
    </g>
    <g class="pele-node clickable">
      <a href="javascript:alert('xss')"><title>Malicious</title><rect width="50" height="20"/></a>
    </g>
  </g>
</svg>`;

const SAMPLE_DIAGRAM_WITH_LINKS = `flowchart LR
    A[Guide] --> B[External]
    click A href "/docs/guide" "Guide"
    click B href "https://github.com" "External"
`;

describe('Native Router Links & SVG Link Enhancement', () => {
  it('returns untouched SVG when no anchor tags are present', () => {
    const rawSvg = '<svg viewBox="0 0 10 10"><rect/></svg>';
    expect(enhanceSvgLinks(rawSvg)).toBe(rawSvg);
  });

  it('preserves internal links while adding target and rel to external links by default', () => {
    const enhanced = enhanceSvgLinks(SAMPLE_LINK_SVG);

    // Internal link preserves its target
    expect(enhanced).toContain('<a href="/docs/guide" target="_self">');

    // External link gets default target="_blank" and rel="noopener noreferrer"
    expect(enhanced).toContain(
      '<a href="https://example.com/external" target="_blank" rel="noopener noreferrer">',
    );

    // Malicious javascript: link is sanitized to #
    expect(enhanced).toContain('<a href="#">');
    expect(enhanced).not.toContain('javascript:alert');
  });

  it('supports custom externalTarget and externalRel', () => {
    const enhanced = enhanceSvgLinks(SAMPLE_LINK_SVG, {
      externalTarget: '_top',
      externalRel: 'external',
    });

    expect(enhanced).toContain(
      '<a href="https://example.com/external" target="_top" rel="external">',
    );
  });

  it('supports custom transformHref for path rewriting', () => {
    const enhanced = enhanceSvgLinks(SAMPLE_LINK_SVG, {
      transformHref: (href) =>
        href.startsWith('/') ? `/subpath${href}` : href,
    });

    expect(enhanced).toContain('<a href="/subpath/docs/guide"');
    expect(enhanced).toContain('<a href="https://example.com/external"');
  });

  it('injects static custom attributes for Astro / Next.js routers', () => {
    const enhanced = enhanceSvgLinks(SAMPLE_LINK_SVG, {
      attributes: {
        'data-astro-prefetch': 'true',
        'data-router-link': 'custom',
      },
    });

    expect(enhanced).toContain('data-astro-prefetch="true"');
    expect(enhanced).toContain('data-router-link="custom"');
  });

  it('injects dynamic functional attributes based on href', () => {
    const enhanced = enhanceSvgLinks(SAMPLE_LINK_SVG, {
      attributes: (href: string): Record<string, string> => {
        if (href.startsWith('/')) {
          return { 'data-astro-prefetch': 'viewport' };
        }
        return { 'data-external-analytics': 'true' };
      },
    });

    expect(enhanced).toContain(
      '<a href="/docs/guide" target="_self" data-astro-prefetch="viewport">',
    );
    expect(enhanced).toContain(
      '<a href="https://example.com/external" target="_blank" rel="noopener noreferrer" data-external-analytics="true">',
    );
  });

  describe('Integration with generateDiagramHtml and markedMermaid', () => {
    it('applies link enhancements through generateDiagramHtml', () => {
      const result = generateDiagramHtml(SAMPLE_DIAGRAM_WITH_LINKS, {
        strategy: 'svg',
        className: 'mermaid-diagram',
        fallbackSummary: 'Text diagram',
        onError: 'code',
        links: {
          attributes: {
            'data-astro-prefetch': 'hover',
          },
        },
      });

      expect(result.success).toBe(true);
      expect(result.html).toContain('data-astro-prefetch="hover"');
      expect(result.html).toContain('href="/docs/guide"');
      expect(result.html).toContain('href="https://github.com/');
    });

    it('applies link enhancements and lightbox together in markedMermaid', () => {
      const ext = markedMermaid({
        strategy: 'svg',
        lightbox: true,
        links: {
          transformHref: (href) =>
            href === '/docs/guide' ? '/v2/guide' : href,
          attributes: { 'data-link-enhanced': 'true' },
        },
      });

      const html = ext.renderer.code({
        text: SAMPLE_DIAGRAM_WITH_LINKS,
        lang: 'mermaid',
      });

      expect(typeof html).toBe('string');
      expect(html).toContain('pele-has-lightbox');
      expect(html).toContain('href="/v2/guide"');
      expect(html).toContain('data-link-enhanced="true"');
    });
  });
});
