import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildSite } from '../site/builder';

describe('Website Scaffolding Integration Tests', () => {
  const rootDir = path.resolve(__dirname, '..');
  const testOutDir = path.join(rootDir, 'temp', 'test-artifacts');

  it('compiles site markdown files into static HTML artifacts', () => {
    const manifest = buildSite({ outDir: testOutDir });

    expect(manifest.pages.length).toBe(5);
    expect(manifest.totalSvgCount).toBeGreaterThanOrEqual(3);
    expect(manifest.totalAsciiCount).toBeGreaterThanOrEqual(3);

    // Verify manifest file exists on disk
    const manifestPath = path.join(testOutDir, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const loadedManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(loadedManifest.pages).toHaveLength(5);
  });

  it('emits theme.css with native design system Pele CSS variables', () => {
    const cssPath = path.join(testOutDir, 'theme.css');
    expect(fs.existsSync(cssPath)).toBe(true);

    const css = fs.readFileSync(cssPath, 'utf-8');
    expect(css).toContain('--pele-bg:');
    expect(css).toContain('--pele-fg:');
    expect(css).toContain('--pele-line:');
    expect(css).toContain('--pele-accent:');
    expect(css).toContain('[data-theme="dark"]');
  });

  it('verifies index.html has static SVG and accessible ASCII fallback without client-side JS', () => {
    const htmlPath = path.join(testOutDir, 'index.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, 'utf-8');

    // 1. Static SVG compiled by Pele
    expect(html).toContain(
      '<svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart"',
    );
    expect(html).toContain('Client');
    expect(html).toContain('Global CDN');
    expect(html).toContain('Origin Server');
    expect(html).toContain('Redis Cache');

    // 2. Accessible ASCII fallback dropdown
    expect(html).toContain('<details class="pele-ascii-fallback">');
    expect(html).toContain('<summary>Text version</summary>');
    expect(html).toContain('┌'); // Unicode box-drawing character

    // 3. Zero client-side mermaid runtime scripts
    expect(html).not.toContain('mermaid.initialize');
    expect(html).not.toContain('mermaid.min.js');
    expect(html).not.toContain(
      '<script src="https://cdn.jsdelivr.net/npm/mermaid',
    );
  });

  it('verifies architecture.html renders complex multi-node TD flowcharts', () => {
    const htmlPath = path.join(testOutDir, 'architecture.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    expect(html).toContain('<svg');
    expect(html).toContain('API Gateway');
    expect(html).toContain('Auth Service');
    expect(html).toContain('Order Service');
    expect(html).toContain('Catalog DB');
  });

  it('verifies accessibility.html provides accessible decision nodes in ASCII fallback', () => {
    const htmlPath = path.join(testOutDir, 'accessibility.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    expect(html).toContain('<details class="pele-ascii-fallback">');
    expect(html).toContain('Approved?');
    expect(html).toContain('Editorial Review');
  });

  it('verifies ascii-terminal.html uses pure text output without SVGs', () => {
    const htmlPath = path.join(testOutDir, 'ascii-terminal.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    expect(html).toContain('class="mermaid-diagram mermaid-ascii"');
    expect(html).toContain('Raw Stream');
    expect(html).toContain('Filter');
    expect(html).toContain('Transformer');
    // Ensure no SVG was generated for strategy: 'ascii'
    expect(html).not.toContain('<svg');
  });

  it('verifies error-handling.html displays error fallback banner without crashing build', () => {
    const htmlPath = path.join(testOutDir, 'error-handling.html');
    const html = fs.readFileSync(htmlPath, 'utf-8');

    expect(html).toContain('class="mermaid-diagram mermaid-error"');
    expect(html).toContain('Failed to render diagram:');
    expect(html).not.toContain('<svg');
  });
});
