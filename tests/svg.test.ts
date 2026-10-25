import { describe, expect, it } from 'vitest';
import { renderSvg } from '../src/index';

describe('renderSvg (Pele integration)', () => {
  it('renders a valid flowchart into SVG markup', () => {
    const code = `graph LR\n  A[Start] --> B[End]`;
    const result = renderSvg(code);

    expect(result.error).toBeUndefined();
    expect(result.svg).toContain('<svg');
    expect(result.svg).toContain('</svg>');
    expect(result.svg).toContain('Start');
    expect(result.svg).toContain('End');
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
    expect(result.type).toBe('flowchart');
  });

  it('embeds CSS variables for design system theming', () => {
    const code = `graph TD\n  Client --> Server`;
    const result = renderSvg(code);

    expect(result.svg).toContain('--pele-bg');
    expect(result.svg).toContain('--pele-fg');
    expect(result.svg).toContain('--pele-line');
    expect(result.svg).toContain('--pele-accent');
  });

  it('injects custom className when provided', () => {
    const code = `graph LR\n  A --> B`;
    const result = renderSvg(code, { className: 'custom-diagram' });

    expect(result.svg).toContain('class="custom-diagram pele');
  });

  it('injects custom id when provided', () => {
    const code = `graph LR\n  A --> B`;
    const result = renderSvg(code, { id: 'diagram-123' });

    expect(result.svg).toContain('id="diagram-123"');
  });

  it('sanitizes className and id to prevent attribute breakout', () => {
    const code = `graph LR\n  A --> B`;
    const result = renderSvg(code, {
      className: 'safe" onmouseover="alert(1)',
      id: 'my-id"><script>',
    });

    expect(result.svg).not.toContain('" onmouseover=');
    expect(result.svg).not.toContain('"><script>');
    expect(result.svg).toContain('class="safe onmouseover=alert(1) pele');
  });

  it('handles invalid or unsupported syntax gracefully', () => {
    const result = renderSvg('invalid !!! diagram syntax');

    expect(result.error).toBeDefined();
    expect(result.svg).toBe('');
    expect(result.type).toBe('error');
  });
});
