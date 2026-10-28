import fs from 'node:fs';
import path from 'node:path';
import { mermaidToAscii } from './index';
import {
  formatLintReport,
  type LintDiagnostic,
  type LintOptions,
  type LintReport,
  lintMarkdown,
} from './lint';
import { generateLlmsFullTxt, generateLlmsIndex } from './llms';
import { renderSvg } from './svg';

const VERSION = '0.1.0-alpha.1';

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
      // Ignore directory read errors
    }
  }

  return files;
}

/**
 * Lints a list of file or directory paths.
 */
export function lintFiles(
  entryPaths: string | string[],
  options: LintOptions = {},
): LintReport {
  const paths = Array.isArray(entryPaths) ? entryPaths : [entryPaths];
  const startTime = Date.now();
  const ignoreSet = new Set([...DEFAULT_IGNORES, ...(options.ignore || [])]);
  const allFiles = new Set<string>();

  for (const entry of paths) {
    const resolved = findMarkdownFiles(entry, ignoreSet);
    for (const file of resolved) {
      allFiles.add(file);
    }
  }

  const diagnostics: LintDiagnostic[] = [];
  let totalDiagrams = 0;

  for (const filePath of allFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileReport = lintMarkdown(
        content,
        path.relative(process.cwd(), filePath),
        options,
      );

      totalDiagrams += fileReport.diagramsCount;
      diagnostics.push(...fileReport.diagnostics);
    } catch {
      // Read failure handled gracefully
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
 * Reads standard input into a string.
 */
async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', (err) => reject(err));
  });
}

/**
 * CLI execution entrypoint for `render` subcommand.
 */
async function handleRenderCommand(args: string[]): Promise<number> {
  let targetFile: string | null = null;
  let format: 'ascii' | 'svg' = 'ascii';
  let asciiOnly = false;
  let strict = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`mermaid-toolkit render - Render Mermaid diagram to ASCII or SVG

Usage:
  mermaid-toolkit render [file | -] [options]

Options:
  -f, --format <format>   Output format: ascii, svg (default: ascii)
  --ascii-only            Use pure ASCII characters (+, -, |) instead of Unicode box-drawing
  -s, --strict            Exit with code 1 if parsing fails
  -h, --help              Show help information
`);
      return 0;
    }
    if (arg === '--format' || arg === '-f') {
      const val = args[++i];
      if (val === 'svg' || val === 'ascii') {
        format = val;
      }
      continue;
    }
    if (arg.startsWith('--format=')) {
      const val = arg.split('=')[1];
      if (val === 'svg' || val === 'ascii') {
        format = val;
      }
      continue;
    }
    if (arg === '--ascii-only') {
      asciiOnly = true;
      continue;
    }
    if (arg === '--strict' || arg === '-s') {
      strict = true;
      continue;
    }
    if (!arg.startsWith('-')) {
      targetFile = arg;
    }
  }

  let code = '';
  if (!targetFile || targetFile === '-') {
    code = await readStdin();
  } else {
    try {
      code = fs.readFileSync(path.resolve(process.cwd(), targetFile), 'utf8');
    } catch {
      console.error(`Failed to read file: ${targetFile}`);
      return 1;
    }
  }

  try {
    if (format === 'svg') {
      const result = renderSvg(code);
      console.log(result.svg);
      return 0;
    }

    const ascii = mermaidToAscii(code, { asciiOnly });
    console.log(ascii);
    return 0;
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    return strict ? 1 : 0;
  }
}

/**
 * CLI execution entrypoint for `llms-txt` subcommand.
 */
async function handleLlmsTxtCommand(args: string[]): Promise<number> {
  let targetDir = '.';
  let outFile: string | null = null;
  let full = false;
  let title = 'Documentation';
  let description = 'Project documentation with ASCII diagram representations';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      console.log(`mermaid-toolkit llms-txt - Generate llms.txt with ASCII diagrams

Usage:
  mermaid-toolkit llms-txt [dir] [options]

Options:
  -o, --out <file>        Output file path (default: stdout)
  --full                  Generate full documentation (llms-full.txt)
  --title <title>         Documentation title
  --desc <description>   Documentation description
  -h, --help              Show help information
`);
      return 0;
    }
    if (arg === '--out' || arg === '-o') {
      outFile = args[++i];
      continue;
    }
    if (arg.startsWith('--out=')) {
      outFile = arg.split('=')[1];
      continue;
    }
    if (arg === '--full') {
      full = true;
      continue;
    }
    if (arg === '--title') {
      title = args[++i] || title;
      continue;
    }
    if (arg === '--desc') {
      description = args[++i] || description;
      continue;
    }
    if (!arg.startsWith('-')) {
      targetDir = arg;
    }
  }

  const ignoreSet = new Set(DEFAULT_IGNORES);
  const files = findMarkdownFiles(
    path.resolve(process.cwd(), targetDir),
    ignoreSet,
  );

  const pages = files.map((file) => {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(process.cwd(), file);
    return {
      title: path.basename(file, path.extname(file)),
      path: relativePath,
      content,
    };
  });

  const output = full
    ? generateLlmsFullTxt(pages)
    : generateLlmsIndex({
        title,
        description,
        sections: [
          {
            title: 'Documentation Pages',
            links: pages.map((p) => ({
              title: p.title,
              url: p.path,
            })),
          },
        ],
      });

  if (outFile) {
    fs.mkdirSync(path.dirname(path.resolve(process.cwd(), outFile)), {
      recursive: true,
    });
    fs.writeFileSync(path.resolve(process.cwd(), outFile), output, 'utf8');
  } else {
    console.log(output);
  }

  return 0;
}

/**
 * CLI execution entrypoint for `theme` subcommand.
 */
async function handleThemeCommand(args: string[]): Promise<number> {
  const themeName = args[0] || 'default';
  if (themeName === '--help' || themeName === '-h') {
    console.log(`mermaid-toolkit theme - Output theme CSS tokens

Usage:
  mermaid-toolkit theme [name]

Available themes:
  default, retro-brutalist, github, tailwind, catppuccin, nord, diff, lightbox
`);
    return 0;
  }

  // Look up CSS in ../themes relative to package directory or compiled dist
  const candidates = [
    path.resolve(__dirname, '../themes', `${themeName}.css`),
    path.resolve(__dirname, '../../themes', `${themeName}.css`),
    path.resolve(process.cwd(), 'themes', `${themeName}.css`),
  ];

  let foundContent: string | null = null;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      foundContent = fs.readFileSync(candidate, 'utf8');
      break;
    }
  }

  if (!foundContent) {
    console.error(
      `Theme "${themeName}" not found. Available themes: default, retro-brutalist, github, tailwind, catppuccin, nord, diff, lightbox`,
    );
    return 1;
  }

  console.log(foundContent);
  return 0;
}

/**
 * CLI execution entrypoint for `lint` subcommand (and backward-compatible `mermaid-lint`).
 */
async function handleLintCommand(argv: string[]): Promise<number> {
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
      console.log(VERSION);
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

/**
 * Universal CLI router for `mermaid-toolkit` and `mermaid-lint`.
 */
export async function runCli(argv = process.argv.slice(2)): Promise<number> {
  const isLintBinary =
    typeof process !== 'undefined' &&
    process.argv[1] &&
    (process.argv[1].endsWith('mermaid-lint') ||
      process.argv[1].endsWith('mermaid-lint.mjs') ||
      process.argv[1].endsWith('mermaid-lint.js'));

  if (isLintBinary) {
    return handleLintCommand(argv);
  }

  const first = argv[0];

  if (!first || first === '--help' || first === '-h') {
    console.log(`mermaid-toolkit - Zero-runtime static Mermaid toolkit

Usage:
  mermaid-toolkit <command> [options]

Commands:
  render [file | -]       Render diagram to ASCII box-drawing or SVG
  lint [paths...]         Static build-time Mermaid diagram linter
  llms-txt [dir]          Generate llms.txt / llms-full.txt with ASCII diagrams
  theme [name]            Emit theme CSS variables for design system integration

Global Options:
  -h, --help              Show help information
  -v, --version           Show version information

Run 'mermaid-toolkit <command> --help' for details on a specific command.
`);
    return 0;
  }

  if (first === '--version' || first === '-v') {
    console.log(VERSION);
    return 0;
  }

  switch (first) {
    case 'render':
      return handleRenderCommand(argv.slice(1));
    case 'lint':
      return handleLintCommand(argv.slice(1));
    case 'llms-txt':
      return handleLlmsTxtCommand(argv.slice(1));
    case 'theme':
      return handleThemeCommand(argv.slice(1));
    default:
      // Default to linting for backward compatibility if argument looks like a path or flag
      return handleLintCommand(argv);
  }
}

// When executed directly as CLI script
if (
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('mermaid-lint') ||
    process.argv[1].endsWith('mermaid-toolkit') ||
    process.argv[1].endsWith('cli.ts') ||
    process.argv[1].endsWith('cli.mjs') ||
    process.argv[1].endsWith('cli.js'))
) {
  runCli().then((code) => {
    process.exit(code);
  });
}
