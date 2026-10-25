import { describe, expect, it } from 'vitest';
import {
  type HastNode,
  type MdastNode,
  rehypeMermaid,
  remarkMermaid,
} from '../src/index';

describe('remarkMermaid (MDX remark plugin)', () => {
  it('transforms mermaid code block with strategy="both" (SVG + ASCII fallback)', () => {
    const ast: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          value: 'graph LR\n  A[Source] --> B[Target]',
        },
      ],
    };

    const plugin = remarkMermaid();
    plugin(ast);

    const first = ast.children?.[0];
    expect(first?.type).toBe('html');
    expect(first?.value).toContain(
      '<figure class="mermaid-diagram pele-container">',
    );
    expect(first?.value).toContain('<svg');
    expect(first?.value).toContain('<details class="pele-ascii-fallback">');
    expect(first?.value).toContain('<summary>Text diagram</summary>');
    expect(first?.value).toContain('Source');
    expect(first?.value).toContain('Target');
  });

  it('transforms with strategy="svg"', () => {
    const ast: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          value: 'graph LR\n  A --> B',
        },
      ],
    };

    const plugin = remarkMermaid({ strategy: 'svg', className: 'my-chart' });
    plugin(ast);

    const first = ast.children?.[0];
    expect(first?.type).toBe('html');
    expect(first?.value).toContain('<div class="my-chart pele-container"><svg');
    expect(first?.value).not.toContain('<details');
  });

  it('transforms with strategy="ascii"', () => {
    const ast: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          value: 'graph LR\n  A --> B',
        },
      ],
    };

    const plugin = remarkMermaid({ strategy: 'ascii' });
    plugin(ast);

    const first = ast.children?.[0];
    expect(first?.type).toBe('html');
    expect(first?.value).toContain(
      '<div class="mermaid-diagram mermaid-ascii"><pre><code>',
    );
    expect(first?.value).not.toContain('<svg');
  });

  it('ignores code blocks with other languages', () => {
    const ast: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'typescript',
          value: 'const x = 1;',
        },
      ],
    };

    const plugin = remarkMermaid();
    plugin(ast);

    expect(ast.children?.[0]?.type).toBe('code');
    expect(ast.children?.[0]?.value).toBe('const x = 1;');
  });

  it('supports custom fallback summary and languages', () => {
    const ast: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'pele',
          value: 'graph LR\n  A --> B',
        },
      ],
    };

    const plugin = remarkMermaid({
      fallbackSummary: 'Show Accessible Diagram',
      languages: ['pele'],
    });
    plugin(ast);

    const first = ast.children?.[0];
    expect(first?.type).toBe('html');
    expect(first?.value).toContain(
      '<summary>Show Accessible Diagram</summary>',
    );
  });

  it('gracefully keeps code block on error with onError="code"', () => {
    const ast: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          value: 'not a diagram',
        },
      ],
    };

    const plugin = remarkMermaid({ onError: 'code' });
    plugin(ast);

    expect(ast.children?.[0]?.type).toBe('code');
  });

  it('replaces code block with error message when onError="error"', () => {
    const ast: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          value: 'not a diagram',
        },
      ],
    };

    const plugin = remarkMermaid({ onError: 'error' });
    plugin(ast);

    const first = ast.children?.[0];
    expect(first?.type).toBe('html');
    expect(first?.value).toContain('mermaid-error');
    expect(first?.value).toContain('Failed to render diagram');
  });

  it('escapes className to prevent HTML attribute breakout', () => {
    const ast: MdastNode = {
      type: 'root',
      children: [
        {
          type: 'code',
          lang: 'mermaid',
          value: 'graph LR\n  A --> B',
        },
      ],
    };

    const plugin = remarkMermaid({
      strategy: 'svg',
      className: 'injected" onclick="alert(1)',
    });
    plugin(ast);

    const first = ast.children?.[0];
    expect(first?.type).toBe('html');
    expect(first?.value).toContain('&quot;');
    expect(first?.value).not.toContain('onclick="alert(1)"');
  });
});

describe('rehypeMermaid (HTML / MDX rehype plugin)', () => {
  it('transforms <pre><code class="language-mermaid"> elements', () => {
    const ast: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {
                className: ['language-mermaid'],
              },
              children: [
                {
                  type: 'text',
                  value: 'graph TD\n  Start --> Stop',
                },
              ],
            },
          ],
        },
      ],
    };

    const plugin = rehypeMermaid();
    plugin(ast);

    const first = ast.children?.[0];
    expect(first?.type).toBe('raw');
    expect(first?.value).toContain(
      '<figure class="mermaid-diagram pele-container">',
    );
    expect(first?.value).toContain('<svg');
  });
});
