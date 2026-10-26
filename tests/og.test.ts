import { describe, expect, it } from 'vitest';
import {
  createOgCard,
  getThemeVariables,
  renderMermaidToPng,
  renderSvgToPng,
  resolveSvgTheme,
} from '../src/og';
import { renderSvg } from '../src/svg';

const SAMPLE_DIAGRAM = `flowchart LR
    Client[Client App] --> Edge[Edge Gateway]
    Edge --> Service[(Core Service)]
`;

describe('Headless OpenGraph (OG) Image Rasterization via resvg', () => {
  describe('getThemeVariables', () => {
    it('returns default light theme variables', () => {
      const vars = getThemeVariables('default', false);
      expect(vars.bg).toBe('#ffffff');
      expect(vars.fg).toBe('#1f1f1f');
      expect(vars.accent).toBe('#5b7bd5');
    });

    it('returns default dark theme variables', () => {
      const vars = getThemeVariables('default', true);
      expect(vars.bg).toBe('#1a1a1a');
      expect(vars.fg).toBe('#e0e0e0');
    });

    it('supports presets including github, tailwind, catppuccin, nord, and retro-brutalist', () => {
      const ghDark = getThemeVariables('github', true);
      expect(ghDark.bg).toBe('#0d1117');
      expect(ghDark.fg).toBe('#e6edf3');

      const catDark = getThemeVariables('catppuccin', true);
      expect(catDark.bg).toBe('#1e1e2e');

      const nordDark = getThemeVariables('nord', true);
      expect(nordDark.bg).toBe('#2e3440');

      const twDark = getThemeVariables('tailwind', true);
      expect(twDark.bg).toBe('#0f172a');

      const retroLight = getThemeVariables('retro-brutalist', false);
      expect(retroLight.bg).toBe('#fffdf0');
      expect(retroLight.border).toBe('#000000');
    });

    it('supports partial custom overrides', () => {
      const vars = getThemeVariables({
        bg: '#112233',
        accent: '#ff00aa',
      });
      expect(vars.bg).toBe('#112233');
      expect(vars.accent).toBe('#ff00aa');
      expect(vars.fg).toBe('#1f1f1f');
    });
  });

  describe('resolveSvgTheme', () => {
    it('replaces CSS custom properties with concrete theme hex colors', () => {
      const { svg } = renderSvg(SAMPLE_DIAGRAM);
      const resolved = resolveSvgTheme(svg, 'github', true);

      expect(resolved).not.toContain('var(--_bg');
      expect(resolved).not.toContain('var(--_fg');
      expect(resolved).not.toContain('var(--_l');
      expect(resolved).toContain('#0d1117');
      expect(resolved).toContain('#e6edf3');
      expect(resolved).toContain('#2f81f7');
    });
  });

  describe('renderSvgToPng and renderMermaidToPng', () => {
    it('rasterizes SVG directly to valid PNG buffer', async () => {
      const { svg } = renderSvg(SAMPLE_DIAGRAM);
      const png = await renderSvgToPng(svg, {
        width: 800,
        theme: 'github',
        darkMode: true,
      });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.length).toBeGreaterThan(500);
      // Valid PNG header: 0x89 0x50 0x4E 0x47
      expect(png[0]).toBe(0x89);
      expect(png[1]).toBe(0x50);
      expect(png[2]).toBe(0x4e);
      expect(png[3]).toBe(0x47);
    });

    it('compiles Mermaid code directly to PNG buffer', async () => {
      const png = await renderMermaidToPng(SAMPLE_DIAGRAM, {
        theme: 'tailwind',
        darkMode: false,
      });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png[0]).toBe(0x89);
      expect(png[1]).toBe(0x50);
    });

    it('throws error when Mermaid code is malformed', async () => {
      await expect(
        renderMermaidToPng('invalid_diagram_syntax_without_type'),
      ).rejects.toThrow('Failed to compile Mermaid diagram');
    });
  });

  describe('createOgCard', () => {
    it('generates standard 1200x630 OpenGraph card PNG with title and subtitle', async () => {
      const png = await createOgCard(SAMPLE_DIAGRAM, {
        title: 'Production Architecture Overview',
        subtitle: 'rtkelly.dev • Infrastructure Documentation',
        theme: 'github',
        darkMode: true,
      });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png.length).toBeGreaterThan(1000);
      expect(png[0]).toBe(0x89);
      expect(png[1]).toBe(0x50);
      expect(png[2]).toBe(0x4e);
      expect(png[3]).toBe(0x47);
    });

    it('works with pre-rendered SVG string', async () => {
      const { svg } = renderSvg(SAMPLE_DIAGRAM);
      const png = await createOgCard(svg, {
        theme: 'catppuccin',
        darkMode: true,
      });

      expect(Buffer.isBuffer(png)).toBe(true);
      expect(png[0]).toBe(0x89);
      expect(png[1]).toBe(0x50);
    });
  });
});
