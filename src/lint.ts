import { renderSvg } from './svg';

export interface LintDiagnostic {
  /** File path where the error was detected */
  file: string;
  /** Line number in the markdown file (1-indexed) */
  line: number;
  /** Line number within the Mermaid diagram block (1-indexed) */
  diagramLine: number;
  /** Severity level */
  severity: 'error' | 'warning';
  /** Clean human-readable error message */
  message: string;
  /** Raw error returned by Pele */
  rawError: string;
  /** Code block snippet where the error occurred */
  snippet?: string;
}

export interface LintOptions {
  /**
   * Code block language identifiers to inspect.
   * @default ['mermaid', 'pele']
   */
  languages?: string[];

  /**
   * File or directory paths / patterns to ignore.
   * @default ['node_modules', '.git', 'dist', 'temp']
   */
  ignore?: string[];

  /**
   * Base working directory for resolving paths.
   * @default process.cwd()
   */
  cwd?: string;
}

export interface LintReport {
  /** Whether all diagrams are valid */
  valid: boolean;
  /** Number of markdown files inspected */
  filesCount: number;
  /** Number of diagrams parsed and validated */
  diagramsCount: number;
  /** Array of diagnostics / syntax errors */
  diagnostics: LintDiagnostic[];
  /** Execution duration in milliseconds */
  durationMs: number;
}

interface ExtractedDiagram {
  code: string;
  startLine: number; // 1-indexed line where code starts
  lang: string;
}

const DEFAULT_LANGUAGES = ['mermaid', 'pele'];

/**
 * Extracts Mermaid fenced code blocks from markdown content, preserving exact file line numbers.
 */
function extractMermaidBlocks(
  content: string,
  allowedLangs: Set<string>,
): ExtractedDiagram[] {
  const lines = content.split(/\r?\n/);
  const blocks: ExtractedDiagram[] = [];

  let inBlock = false;
  let blockFence = '';
  let blockLang = '';
  let blockStartLine = 0;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (!inBlock) {
      const match = line.match(/^(\s*)(`{3,}|~{3,})\s*([a-zA-Z0-9_-]+)?/);
      if (match) {
        const fence = match[2];
        const lang = (match[3] || '').trim().toLowerCase();
        if (allowedLangs.has(lang)) {
          inBlock = true;
          blockFence = fence;
          blockLang = lang;
          blockStartLine = lineNum + 1;
          codeLines = [];
        }
      }
    } else {
      // Check for closing fence matching the opening fence
      const closeMatch = line.match(/^(\s*)(`{3,}|~{3,})\s*$/);
      if (closeMatch?.[2].startsWith(blockFence[0])) {
        blocks.push({
          code: codeLines.join('\n'),
          startLine: blockStartLine,
          lang: blockLang,
        });
        inBlock = false;
        codeLines = [];
      } else {
        codeLines.push(line);
      }
    }
  }

  return blocks;
}

/**
 * Parses Pele's error output to extract the specific diagram line number and clean message.
 */
function parsePeleError(errorMsg: string): {
  diagramLine: number;
  cleanedMessage: string;
} {
  const lineMatch = errorMsg.match(/Parse error on line (\d+)/i);
  const diagramLine = lineMatch ? parseInt(lineMatch[1], 10) : 1;

  // Extract cleanest single-line error summary
  const lines = errorMsg.split('\n');
  const summaryLine =
    lines.find(
      (l) =>
        l.trim().length > 0 &&
        !l.toLowerCase().includes('parse error on line') &&
        l.trim() !== '^',
    ) || errorMsg;

  return {
    diagramLine,
    cleanedMessage: summaryLine.trim(),
  };
}

/**
 * Lints a single Markdown string for Mermaid syntax errors.
 * Isomorphic and zero-dependency: safe for browsers, edge runtimes, and Node.js.
 */
export function lintMarkdown(
  content: string,
  filePath = '<stdin>',
  options: LintOptions = {},
): { diagnostics: LintDiagnostic[]; diagramsCount: number } {
  const languages = new Set(
    (options.languages ?? DEFAULT_LANGUAGES).map((l) => l.toLowerCase()),
  );
  const blocks = extractMermaidBlocks(content, languages);
  const diagnostics: LintDiagnostic[] = [];

  for (const block of blocks) {
    const result = renderSvg(block.code);
    if (result.error) {
      const { diagramLine, cleanedMessage } = parsePeleError(result.error);
      const fileLine = block.startLine + Math.max(0, diagramLine - 1);

      // Extract code line snippet if possible
      const codeLines = block.code.split(/\r?\n/);
      const snippet = codeLines[diagramLine - 1]?.trim();

      diagnostics.push({
        file: filePath,
        line: fileLine,
        diagramLine,
        severity: 'error',
        message: cleanedMessage,
        rawError: result.error,
        snippet,
      });
    }
  }

  return { diagnostics, diagramsCount: blocks.length };
}

/**
 * Formats a LintReport into terminal-friendly stylish output or JSON.
 */
export function formatLintReport(
  report: LintReport,
  format: 'stylish' | 'json' = 'stylish',
): string {
  if (format === 'json') {
    return JSON.stringify(report, null, 2);
  }

  const lines: string[] = [];

  if (report.diagnostics.length > 0) {
    // Group diagnostics by file
    const byFile = new Map<string, LintDiagnostic[]>();
    for (const diag of report.diagnostics) {
      const list = byFile.get(diag.file) || [];
      list.push(diag);
      byFile.set(diag.file, list);
    }

    for (const [file, diags] of byFile.entries()) {
      lines.push(`\n${file}`);
      for (const diag of diags) {
        lines.push(
          `  ${diag.line}:${diag.diagramLine}  error  ${diag.message}`,
        );
        if (diag.snippet) {
          lines.push(`    | ${diag.snippet}`);
        }
      }
    }

    lines.push(
      `\n✖ ${report.diagnostics.length} error${report.diagnostics.length === 1 ? '' : 's'} found in ${report.diagramsCount} diagram${report.diagramsCount === 1 ? '' : 's'} (${report.filesCount} file${report.filesCount === 1 ? '' : 's'} checked in ${report.durationMs}ms)`,
    );
  } else {
    lines.push(
      `✔ ${report.filesCount} file${report.filesCount === 1 ? '' : 's'} checked (${report.diagramsCount} diagram${report.diagramsCount === 1 ? '' : 's'} valid in ${report.durationMs}ms)`,
    );
  }

  return lines.join('\n');
}
