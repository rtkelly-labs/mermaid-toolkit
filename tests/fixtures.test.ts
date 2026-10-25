import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { mermaidToAscii, remarkMermaid, renderSvg } from '../src/index';

/**
 * Validates strict XML tag nesting and balance for SVG strings.
 */
function assertWellFormedSvg(svg: string) {
  expect(svg).toMatch(/^<svg\b[^>]*>/);
  expect(svg).toMatch(/<\/svg>$/);

  const tagStack: string[] = [];
  const tagRegex = /<(\/?[a-zA-Z0-9:-]+)(?:\s+[^>]*?)?(\/?)>/g;
  let match: RegExpExecArray | null = tagRegex.exec(svg);

  while (match !== null) {
    const fullTag = match[0];
    const rawTag = match[1];

    if (rawTag.startsWith('/')) {
      const closingTagName = rawTag.slice(1).toLowerCase();
      const lastTag = tagStack.pop();
      expect(lastTag).toBe(closingTagName);
    } else if (!fullTag.endsWith('/>')) {
      tagStack.push(rawTag.toLowerCase());
    }
    match = tagRegex.exec(svg);
  }

  expect(tagStack).toHaveLength(0);
}

function getFixtureFiles(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getFixtureFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function extractMermaidCode(markdown: string): string {
  const match = markdown.match(/```mermaid\n([\s\S]*?)\n```/);
  if (!match) {
    throw new Error('No mermaid code block found in markdown');
  }
  return match[1].trim();
}

describe('Foundational Mermaid Diagram Fixtures', () => {
  const fixturesDir = path.resolve(__dirname, '..', 'fixtures');
  const fixtureFiles = getFixtureFiles(fixturesDir);

  it('locates all fixture files across the 6 paradigms', () => {
    expect(fixtureFiles.length).toBeGreaterThanOrEqual(20);
  });

  describe('Pele Static SVG Rendering', () => {
    for (const filePath of fixtureFiles) {
      const relativeName = path.relative(fixturesDir, filePath);
      const isMalformedTest = relativeName.includes(
        'malformed-syntax-recovery',
      );

      it(`compiles SVG for ${relativeName}`, () => {
        const md = fs.readFileSync(filePath, 'utf-8');
        const code = extractMermaidCode(md);
        const result = renderSvg(code);

        if (isMalformedTest) {
          expect(result.error).toBeDefined();
          expect(result.type).toBe('error');
          expect(result.svg).toBe('');
        } else {
          expect(result.error).toBeUndefined();
          expect(result.svg).toContain('<svg');
          expect(result.svg).toContain('</svg>');
          expect(result.width).toBeGreaterThan(0);
          expect(result.height).toBeGreaterThan(0);
          // Pele includes --pele-* CSS variables
          expect(result.svg).toContain('--pele-');
          // Static XML well-formedness
          assertWellFormedSvg(result.svg);
        }
      });
    }
  });

  describe('ASCII / Unicode Text Generation', () => {
    for (const filePath of fixtureFiles) {
      const relativeName = path.relative(fixturesDir, filePath);
      const isFlowchart =
        relativeName.includes('flowchart') || relativeName.includes('nested');

      it(`generates ASCII / Unicode output for ${relativeName}`, () => {
        const md = fs.readFileSync(filePath, 'utf-8');
        const code = extractMermaidCode(md);
        const ascii = mermaidToAscii(code);

        expect(typeof ascii).toBe('string');
        expect(ascii.length).toBeGreaterThan(0);

        if (isFlowchart) {
          // Flowcharts must contain Unicode box-drawing characters
          const hasBoxChars = /[┌┬┐├┼┤└┴┘│─]/.test(ascii);
          expect(hasBoxChars).toBe(true);
        }
      });
    }
  });

  describe('MDX / Remark Plugin Static Compilation', () => {
    for (const filePath of fixtureFiles) {
      const relativeName = path.relative(fixturesDir, filePath);
      const isMalformedTest = relativeName.includes(
        'malformed-syntax-recovery',
      );

      it(`transforms ${relativeName} with dual SVG + ASCII fallback`, () => {
        const md = fs.readFileSync(filePath, 'utf-8');
        const code = extractMermaidCode(md);

        // Simulate remark transform using remarkMermaid helper
        const plugin = remarkMermaid({
          strategy: 'both',
          fallbackSummary: 'Accessible Text Version',
          onError: 'error',
        });

        const ast = {
          type: 'root',
          children: [
            {
              type: 'code',
              lang: 'mermaid',
              value: code,
            },
          ],
        };

        plugin(ast);

        expect(ast.children).toHaveLength(1);
        const transformedNode = ast.children[0];
        expect(transformedNode.type).toBe('html');
        const html = transformedNode.value as string;

        if (isMalformedTest) {
          expect(html).toContain('class="mermaid-diagram mermaid-error"');
          expect(html).toContain('Failed to render diagram:');
        } else {
          expect(html).toContain('class="mermaid-diagram pele-container"');
          expect(html).toContain('<div class="pele-svg-wrapper">');
          expect(html).toContain('<details class="pele-ascii-fallback">');
          expect(html).toContain('<summary>Accessible Text Version</summary>');
          expect(html).toContain('<svg');
        }
      });
    }
  });
});
