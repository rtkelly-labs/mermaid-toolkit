import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import packageJson from '../package.json';
import { renderSvg } from '../src/index';

describe('CSS Theme Presets (Issue #50)', () => {
  const themesDir = path.resolve(__dirname, '..', 'themes');
  const expectedThemes = [
    'default.css',
    'retro-brutalist.css',
    'github.css',
    'tailwind.css',
    'catppuccin.css',
    'nord.css',
  ];

  it('exposes all expected theme files', () => {
    for (const themeFile of expectedThemes) {
      const fullPath = path.join(themesDir, themeFile);
      expect(fs.existsSync(fullPath)).toBe(true);
    }
  });

  it('exports ./themes/* in package.json and marks stylesheets as side effects', () => {
    expect(packageJson.exports).toHaveProperty('./themes/*');
    expect(packageJson.exports['./themes/*']).toBe('./themes/*');
    expect(packageJson.files).toContain('themes');
    expect(packageJson.sideEffects).toContain('themes/*.css');
  });

  for (const themeFile of expectedThemes) {
    describe(`Theme: ${themeFile}`, () => {
      const content = fs.readFileSync(path.join(themesDir, themeFile), 'utf-8');

      it('declares foundational Pele variables', () => {
        const requiredVars = [
          '--pele-bg:',
          '--pele-fg:',
          '--pele-line:',
          '--pele-surface:',
          '--pele-border:',
          '--pele-accent:',
          '--pele-font:',
          '--pele-radius:',
        ];
        for (const v of requiredVars) {
          expect(content).toContain(v);
        }
      });

      it('declares series palette colors 1 through 8', () => {
        for (let i = 1; i <= 8; i++) {
          expect(content).toContain(`--pele-series-${i}:`);
        }
      });

      it('includes dark mode overrides for root and descendant .pele elements', () => {
        expect(content).toContain('[data-theme="dark"]');
        expect(content).toContain('[data-theme="dark"] .pele');
        expect(content).toContain('@media (prefers-color-scheme: dark)');
      });
    });
  }

  it('renders SVG matching retro-brutalist theme structure', () => {
    const retroCss = fs.readFileSync(
      path.join(themesDir, 'retro-brutalist.css'),
      'utf-8',
    );
    // Verify specific palette from personal/docs is present
    expect(retroCss).toContain('#06b6d4'); // Cyan
    expect(retroCss).toContain('#ec4899'); // Pink
    expect(retroCss).toContain('#facc15'); // Yellow
    expect(retroCss).toContain('IBM Plex Mono');

    const result = renderSvg('graph LR\n  A --> B');
    expect(result.svg).toContain('--_bg:var(--pele-bg,#fff)');
    expect(result.svg).toContain('--_fg:var(--pele-fg,#1f1f1f)');
    expect(result.svg).toContain('--_l:var(--pele-line,#1f1f1f)');
  });
});
