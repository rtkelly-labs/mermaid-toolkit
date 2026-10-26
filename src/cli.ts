import fs from 'node:fs';
import path from 'node:path';
import {
  formatLintReport,
  type LintDiagnostic,
  type LintOptions,
  type LintReport,
  lintMarkdown,
} from './lint';

const DEFAULT_IGNORES = [
  'node_modules',
  '.git',
  'dist',
  'temp',
  '.gemini',
  'coverage',
];

/**
 * Recursively resolves files in directories matching markdown extensions (.md, .mdx).
 */
export function findMarkdownFiles(
  entryPath: string,
  ignores: Set<string>,
  files: string[] = [],
): string[] {
  if (!fs.existsSync(entryPath)) {
    return files;
  }

  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    const ext = path.extname(entryPath).toLowerCase();
    if (ext === '.md' || ext === '.mdx' || ext === '.markdown') {
      files.push(entryPath);
    }
    return files;
  }

  if (stat.isDirectory()) {
    const baseName = path.basename(entryPath);
    if (ignores.has(baseName)) {
      return files;
    }

    try {
      const entries = fs.readdirSync(entryPath, { withFileTypes: true });
      for (const entry of entries) {
        if (ignores.has(entry.name)) {
          continue;
        }
        const fullPath = path.join(entryPath, entry.name);
        if (entry.isDirectory()) {
          findMarkdownFiles(fullPath, ignores, files);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (ext === '.md' || ext === '.mdx' || ext === '.markdown') {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore unreadable directories
    }
  }

  return files;
}

/**
 * Scans and lints markdown files across specified paths or globs.
 */
export function lintFiles(
  targets: string | string[],
  options: LintOptions = {},
): LintReport {
  const startTime = Date.now();
  const cwd = options.cwd ?? process.cwd();
  const targetList = Array.isArray(targets)
    ? targets
    : targets
      ? [targets]
      : ['.'];
  const userIgnores = new Set([...DEFAULT_IGNORES, ...(options.ignore ?? [])]);

  const allFiles = new Set<string>();
  for (const target of targetList) {
    const resolved = path.resolve(cwd, target);
    const matched = findMarkdownFiles(resolved, userIgnores);
    for (const file of matched) {
      allFiles.add(file);
    }
  }

  let totalDiagrams = 0;
  const diagnostics: LintDiagnostic[] = [];

  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const relPath = path.relative(cwd, file) || file;
      const result = lintMarkdown(content, relPath, options);
      totalDiagrams += result.diagramsCount;
      diagnostics.push(...result.diagnostics);
    } catch (err) {
      diagnostics.push({
        file,
        line: 1,
        diagramLine: 1,
        severity: 'error',
        message: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
        rawError: String(err),
      });
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    valid: diagnostics.length === 0,
    filesCount: allFiles.size,
    diagramsCount: totalDiagrams,
    diagnostics,
    durationMs,
  };
}

/**
 * CLI execution entrypoint for mermaid-lint.
 */
export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  let format: 'stylish' | 'json' = 'stylish';
  let quiet = false;
  const targets: string[] = [];
  const ignores: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`mermaid-lint - Static build-time Mermaid diagram linter

Usage:
  mermaid-lint [paths...] [options]

Options:
  -f, --format <format>   Output format: stylish, json (default: stylish)
  -q, --quiet             Only output on errors
  -i, --ignore <pattern>  Directory or file pattern to ignore (repeatable)
  -h, --help              Show help information
  -v, --version           Show version information

Examples:
  mermaid-lint
  mermaid-lint docs/ README.md
  mermaid-lint --format json
`);
      return 0;
    }
    if (arg === '--version' || arg === '-v') {
      console.log('0.1.0-alpha.0');
      return 0;
    }
    if (arg === '--quiet' || arg === '-q') {
      quiet = true;
      continue;
    }
    if (arg === '--format' || arg === '-f') {
      const next = argv[++i];
      if (next === 'json' || next === 'stylish') {
        format = next;
      }
      continue;
    }
    if (arg.startsWith('--format=')) {
      const val = arg.split('=')[1];
      if (val === 'json' || val === 'stylish') {
        format = val;
      }
      continue;
    }
    if (arg === '--ignore' || arg === '-i') {
      const next = argv[++i];
      if (next) {
        ignores.push(next);
      }
      continue;
    }
    if (arg.startsWith('-')) {
      console.error(`Unknown option: ${arg}`);
      return 1;
    }
    targets.push(arg);
  }

  const report = lintFiles(targets.length > 0 ? targets : ['.'], {
    ignore: ignores,
  });

  if (!quiet || !report.valid) {
    const output = formatLintReport(report, format);
    if (report.valid) {
      console.log(output);
    } else {
      console.error(output);
    }
  }

  return report.valid ? 0 : 1;
}

// When executed directly as CLI script
if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('mermaid-lint') ||
    process.argv[1].endsWith('cli.ts') ||
    process.argv[1].endsWith('cli.mjs') ||
    process.argv[1].endsWith('cli.js'))
) {
  runCli().then((code) => {
    process.exit(code);
  });
}
