import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runCli } from '../src/cli';

const VALID_FLOWCHART = `graph LR
    A[Client] --> B[Server]
`;

describe('mermaid-toolkit Universal CLI Suite (Issue #24)', () => {
  it('returns code 0 on top-level --help', async () => {
    const code = await runCli(['--help']);
    expect(code).toBe(0);
  });

  it('returns code 0 on top-level --version', async () => {
    const code = await runCli(['--version']);
    expect(code).toBe(0);
  });

  describe('render subcommand', () => {
    it('shows render help with --help', async () => {
      const code = await runCli(['render', '--help']);
      expect(code).toBe(0);
    });

    it('renders a mermaid file to ASCII by default', async () => {
      const tempDir = path.resolve(__dirname, '../temp/cli-render-test');
      fs.mkdirSync(tempDir, { recursive: true });
      const mmdPath = path.join(tempDir, 'diagram.mmd');
      fs.writeFileSync(mmdPath, VALID_FLOWCHART, 'utf8');

      const code = await runCli(['render', mmdPath]);
      expect(code).toBe(0);
    });

    it('renders a mermaid file to SVG with --format svg', async () => {
      const tempDir = path.resolve(__dirname, '../temp/cli-render-test');
      fs.mkdirSync(tempDir, { recursive: true });
      const mmdPath = path.join(tempDir, 'diagram.mmd');
      fs.writeFileSync(mmdPath, VALID_FLOWCHART, 'utf8');

      const code = await runCli(['render', mmdPath, '--format', 'svg']);
      expect(code).toBe(0);
    });

    it('returns code 1 when target file is not found', async () => {
      const code = await runCli(['render', 'non-existent-file.mmd']);
      expect(code).toBe(1);
    });
  });

  describe('llms-txt subcommand', () => {
    it('shows llms-txt help with --help', async () => {
      const code = await runCli(['llms-txt', '--help']);
      expect(code).toBe(0);
    });

    it('generates llms.txt file from target markdown directory', async () => {
      const tempDir = path.resolve(__dirname, '../temp/cli-llms-test');
      fs.mkdirSync(tempDir, { recursive: true });
      const mdPath = path.join(tempDir, 'doc.md');
      fs.writeFileSync(
        mdPath,
        `# Architecture\n\`\`\`mermaid\ngraph LR\nA --> B\n\`\`\`\n`,
        'utf8',
      );

      const outPath = path.join(tempDir, 'llms.txt');
      const code = await runCli([
        'llms-txt',
        tempDir,
        '--out',
        outPath,
        '--title',
        'Test Docs',
      ]);
      expect(code).toBe(0);
      expect(fs.existsSync(outPath)).toBe(true);
      const content = fs.readFileSync(outPath, 'utf8');
      expect(content).toContain('# Test Docs');
      expect(content).toContain('doc.md');
    });

    it('generates full documentation with --full flag', async () => {
      const tempDir = path.resolve(__dirname, '../temp/cli-llms-full-test');
      fs.mkdirSync(tempDir, { recursive: true });
      const mdPath = path.join(tempDir, 'guide.md');
      fs.writeFileSync(
        mdPath,
        `# Guide\n\`\`\`mermaid\ngraph LR\nClient --> Server\n\`\`\`\n`,
        'utf8',
      );

      const outPath = path.join(tempDir, 'llms-full.txt');
      const code = await runCli([
        'llms-txt',
        tempDir,
        '--out',
        outPath,
        '--full',
      ]);
      expect(code).toBe(0);
      expect(fs.existsSync(outPath)).toBe(true);
      const content = fs.readFileSync(outPath, 'utf8');
      expect(content).toContain('Source: temp/cli-llms-full-test/guide.md');
      expect(content).toContain('┌────────┐');
    });
  });

  describe('theme subcommand', () => {
    it('shows theme help with --help', async () => {
      const code = await runCli(['theme', '--help']);
      expect(code).toBe(0);
    });

    it('outputs default theme CSS tokens', async () => {
      const code = await runCli(['theme', 'default']);
      expect(code).toBe(0);
    });

    it('outputs retro-brutalist theme CSS tokens', async () => {
      const code = await runCli(['theme', 'retro-brutalist']);
      expect(code).toBe(0);
    });

    it('returns code 1 on unknown theme', async () => {
      const code = await runCli(['theme', 'non-existent-theme']);
      expect(code).toBe(1);
    });
  });
});
