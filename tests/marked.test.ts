import { describe, expect, it } from 'vitest';
import { markedMermaid } from '../src/index';

describe('markedMermaid Extension (Issue #44)', () => {
  const extension = markedMermaid({
    strategy: 'both',
    fallbackSummary: 'Text fallback',
  });

  it('provides a renderer.code method compatible with Marked', () => {
    expect(extension).toHaveProperty('renderer');
    expect(extension.renderer).toHaveProperty('code');
    expect(typeof extension.renderer.code).toBe('function');
  });

  it('renders a mermaid code block into static Pele SVG and ASCII fallback', () => {
    const code = `graph TD\n  Client --> Gateway`;
    const token = { text: code, lang: 'mermaid' };

    const result = extension.renderer.code(token);
    expect(typeof result).toBe('string');
    expect(result).toContain('<figure class="mermaid-diagram pele-container"');
    expect(result).toContain('<div class="pele-svg-wrapper">');
    expect(result).toContain('<svg');
    expect(result).toContain('<details class="pele-ascii-fallback">');
    expect(result).toContain('<summary>Text fallback</summary>');
    expect(result).toContain('Client');
    expect(result).toContain('Gateway');
  });

  it('supports "pele" as code block language', () => {
    const code = `graph LR\n  A --> B`;
    const token = { text: code, lang: 'pele' };

    const result = extension.renderer.code(token);
    expect(typeof result).toBe('string');
    expect(result).toContain('<svg');
  });

  it('returns false for non-mermaid code blocks so Marked renders default code', () => {
    const token = { text: 'const x = 1;', lang: 'typescript' };
    const result = extension.renderer.code(token);
    expect(result).toBe(false);
  });

  it('supports legacy Marked renderer signature code(code, lang)', () => {
    const code = `graph LR\n  A --> B`;
    const result = extension.renderer.code(code, 'mermaid');
    expect(typeof result).toBe('string');
    expect(result).toContain('<svg');
  });

  it('respects strategy: "ascii"', () => {
    const asciiExt = markedMermaid({ strategy: 'ascii' });
    const code = `graph LR\n  Source --> Target`;
    const result = asciiExt.renderer.code({ text: code, lang: 'mermaid' });

    expect(typeof result).toBe('string');
    expect(result).toContain('class="mermaid-diagram mermaid-ascii"');
    expect(result).not.toContain('<svg');
  });

  it('respects strategy: "svg"', () => {
    const svgExt = markedMermaid({ strategy: 'svg' });
    const code = `graph LR\n  Source --> Target`;
    const result = svgExt.renderer.code({ text: code, lang: 'mermaid' });

    expect(typeof result).toBe('string');
    expect(result).toContain('<div class="mermaid-diagram pele-container">');
    expect(result).toContain('<svg');
    expect(result).not.toContain('<details');
  });

  it('handles malformed diagrams with onError: "error"', () => {
    const errExt = markedMermaid({ onError: 'error' });
    const result = errExt.renderer.code({
      text: 'invalid !! diagram',
      lang: 'mermaid',
    });

    expect(typeof result).toBe('string');
    expect(result).toContain('class="mermaid-diagram mermaid-error"');
    expect(result).toContain('Failed to render diagram:');
  });

  it('handles malformed diagrams with onError: "code" by returning false', () => {
    const codeExt = markedMermaid({ onError: 'code' });
    const result = codeExt.renderer.code({
      text: 'invalid !! diagram',
      lang: 'mermaid',
    });

    expect(result).toBe(false);
  });
});
