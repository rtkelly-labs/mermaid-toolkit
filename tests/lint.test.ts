import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { lintFiles, runCli } from '../src/cli';
import { formatLintReport, lintMarkdown } from '../src/index';

const VALID_MARKDOWN = `# Architecture Overview

Here is the system flow:

\`\`\`mermaid
flowchart LR
    Client --> API
    API --> DB[(Database)]
\`\`\`

And a sequence diagram:

~~~pele
sequenceDiagram
    Alice->>Bob: Hello
    Bob-->>Alice: Hi!
~~~

Done.
`;

const INVALID_MARKDOWN = `# System Design

Some initial content.

\`\`\`mermaid
flowchart TD
    A[Start] --> B[Unclosed Label
    B --> C[End]
\`\`\`

More content.
`;

describe('Static Build-time Diagram Linting CLI & API', () => {
  describe('lintMarkdown', () => {
    it('returns no diagnostics and reports correct diagram count for valid diagrams', () => {
      const result = lintMarkdown(VALID_MARKDOWN, 'docs/valid.md');

      expect(result.diagnostics).toHaveLength(0);
      expect(result.diagramsCount).toBe(2);
    });

    it('pinpoints exact line number and error message for invalid diagrams', () => {
      const result = lintMarkdown(INVALID_MARKDOWN, 'docs/invalid.md');

      expect(result.diagramsCount).toBe(1);
      expect(result.diagnostics).toHaveLength(1);

      const diag = result.diagnostics[0];
      expect(diag.file).toBe('docs/invalid.md');
      expect(diag.severity).toBe('error');
      expect(diag.line).toBe(8);
      expect(diag.snippet).toContain('B --> C');
      expect(diag.message).toBeTruthy();
    });

    it('ignores non-mermaid code blocks', () => {
      const content = `\`\`\`typescript
const x: number = 10;
\`\`\`
\`\`\`bash
echo "Hello"
\`\`\`
`;
      const result = lintMarkdown(content, 'test.md');
      expect(result.diagramsCount).toBe(0);
      expect(result.diagnostics).toHaveLength(0);
    });

    it('supports custom language identifiers', () => {
      const content = `\`\`\`custom-diag
flowchart LR
    A --> B
\`\`\`
`;
      const result = lintMarkdown(content, 'custom.md', {
        languages: ['custom-diag'],
      });
      expect(result.diagramsCount).toBe(1);
      expect(result.diagnostics).toHaveLength(0);
    });
  });

  describe('lintFiles', () => {
    it('successfully validates existing valid fixtures', () => {
      const fixturesDir = path.resolve(__dirname, '../fixtures');
      const report = lintFiles(fixturesDir, {
        ignore: ['06-edge-cases-and-resilience'],
      });

      expect(report.valid).toBe(true);
      expect(report.filesCount).toBeGreaterThanOrEqual(18);
      expect(report.diagramsCount).toBeGreaterThanOrEqual(18);
      expect(report.diagnostics).toHaveLength(0);
      expect(report.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('correctly catches intentional syntax errors in edge case fixture', () => {
      const badFixture = path.resolve(
        __dirname,
        '../fixtures/06-edge-cases-and-resilience/malformed-syntax-recovery.md',
      );
      const report = lintFiles(badFixture);

      expect(report.valid).toBe(false);
      expect(report.diagnostics.length).toBeGreaterThanOrEqual(1);
      expect(report.diagnostics[0].message).toContain(
        'No diagram type detected',
      );
    });

    it('detects broken diagrams across multiple target files', () => {
      const tempDir = path.resolve(__dirname, '../temp/lint-test');
      fs.mkdirSync(tempDir, { recursive: true });

      const file1 = path.join(tempDir, 'page1.md');
      const file2 = path.join(tempDir, 'page2.md');

      fs.writeFileSync(file1, VALID_MARKDOWN, 'utf8');
      fs.writeFileSync(file2, INVALID_MARKDOWN, 'utf8');

      try {
        const report = lintFiles(tempDir);
        expect(report.valid).toBe(false);
        expect(report.diagnostics.length).toBeGreaterThanOrEqual(1);
        expect(report.diagnostics[0].file).toContain('page2.md');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('respects custom ignore patterns', () => {
      const tempDir = path.resolve(__dirname, '../temp/lint-ignore-test');
      const ignoredSubdir = path.join(tempDir, 'ignored-dir');
      fs.mkdirSync(ignoredSubdir, { recursive: true });

      fs.writeFileSync(
        path.join(ignoredSubdir, 'bad.md'),
        INVALID_MARKDOWN,
        'utf8',
      );

      try {
        const report = lintFiles(tempDir, {
          ignore: ['ignored-dir'],
        });
        expect(report.valid).toBe(true);
        expect(report.diagnostics).toHaveLength(0);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('formatLintReport', () => {
    it('formats clean report in stylish mode when diagrams are valid', () => {
      const report = {
        valid: true,
        filesCount: 15,
        diagramsCount: 30,
        diagnostics: [],
        durationMs: 42,
      };

      const output = formatLintReport(report, 'stylish');
      expect(output).toContain('✔ 15 files checked (30 diagrams valid');
    });

    it('formats error report in stylish mode with file paths and line numbers', () => {
      const report = {
        valid: false,
        filesCount: 2,
        diagramsCount: 3,
        diagnostics: [
          {
            file: 'docs/arch.md',
            line: 42,
            diagramLine: 3,
            severity: 'error' as const,
            message: 'Expecting SQE, got end',
            rawError: 'Parse error on line 3',
            snippet: 'A[Unclosed',
          },
        ],
        durationMs: 12,
      };

      const output = formatLintReport(report, 'stylish');
      expect(output).toContain('docs/arch.md');
      expect(output).toContain('42:3  error  Expecting SQE, got end');
      expect(output).toContain('| A[Unclosed');
      expect(output).toContain('✖ 1 error found in 3 diagrams');
    });

    it('formats report in JSON format', () => {
      const report = {
        valid: true,
        filesCount: 5,
        diagramsCount: 10,
        diagnostics: [],
        durationMs: 25,
      };

      const jsonStr = formatLintReport(report, 'json');
      const parsed = JSON.parse(jsonStr);
      expect(parsed.valid).toBe(true);
      expect(parsed.filesCount).toBe(5);
    });
  });

  describe('runCli', () => {
    it('returns code 0 on --help', async () => {
      const code = await runCli(['--help']);
      expect(code).toBe(0);
    });

    it('returns code 0 on --version', async () => {
      const code = await runCli(['--version']);
      expect(code).toBe(0);
    });

    it('returns code 0 when linting fixtures directory with --quiet', async () => {
      const fixturesDir = path.resolve(__dirname, '../fixtures');
      const code = await runCli([
        fixturesDir,
        '--ignore',
        '06-edge-cases-and-resilience',
        '--quiet',
      ]);
      expect(code).toBe(0);
    });

    it('returns code 1 when target directory has broken diagram', async () => {
      const tempDir = path.resolve(__dirname, '../temp/cli-broken');
      fs.mkdirSync(tempDir, { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, 'broken.md'),
        INVALID_MARKDOWN,
        'utf8',
      );

      try {
        const code = await runCli([tempDir, '--format=json', '--quiet']);
        expect(code).toBe(1);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});
