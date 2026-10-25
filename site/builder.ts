import fs from 'node:fs';
import path from 'node:path';
import { type MdastNode, remarkMermaid } from '../src/index';

export interface BuildSiteOptions {
  /** Source markdown content directory (default: site/content) */
  contentDir?: string;
  /** Output directory for built HTML artifacts (default: temp/site-artifacts) */
  outDir?: string;
  /** Path to theme.css file (default: site/theme.css) */
  themeCssPath?: string;
}

export interface PageManifest {
  name: string;
  title: string;
  svgCount: number;
  asciiCount: number;
  size: number;
}

export interface BuildManifest {
  generatedAt: string;
  pages: PageManifest[];
  totalSvgCount: number;
  totalAsciiCount: number;
}

const NAV_LINKS = [
  { href: 'index.html', title: 'Home' },
  { href: 'architecture.html', title: 'Architecture' },
  { href: 'accessibility.html', title: 'Accessibility' },
  { href: 'ascii-terminal.html', title: 'Terminal / ASCII' },
  { href: 'error-handling.html', title: 'Error Fallback' },
  { href: 'fixtures.html', title: 'Fixtures Gallery' },
];

function renderNav(activeHref: string): string {
  return NAV_LINKS.map((link) => {
    const isCurrent = link.href === activeHref;
    const style = isCurrent
      ? 'font-weight: 700; text-decoration: underline;'
      : '';
    return `<a href="${link.href}" style="${style}">${link.title}</a>`;
  }).join(' ');
}

function escapeHtmlProse(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  // Render markdown inline code `...` as <code>...</code>
  return escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
}

function parseSimpleMarkdownToAst(markdown: string): MdastNode {
  const lines = markdown.split('\n');
  const children: MdastNode[] = [];
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        children.push({
          type: 'code',
          lang: codeLang,
          value: codeLines.join('\n'),
        });
        inCodeBlock = false;
        codeLang = '';
        codeLines = [];
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith('# ')) {
      children.push({
        type: 'html',
        value: `<h1>${escapeHtmlProse(line.slice(2))}</h1>`,
      });
    } else if (line.startsWith('## ')) {
      children.push({
        type: 'html',
        value: `<h2>${escapeHtmlProse(line.slice(3))}</h2>`,
      });
    } else if (line.trim().length > 0) {
      children.push({
        type: 'html',
        value: `<p>${escapeHtmlProse(line)}</p>`,
      });
    }
  }

  return { type: 'root', children };
}

function renderHtmlTemplate(
  title: string,
  bodyContent: string,
  currentFile: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | @rtkelly-labs/mermaid-toolkit</title>
  <link rel="stylesheet" href="theme.css">
</head>
<body>
  <div class="container">
    <header>
      <h1>@rtkelly-labs/mermaid-toolkit</h1>
      <nav>
        ${renderNav(currentFile)}
      </nav>
    </header>
    <main>
      ${bodyContent}
    </main>
  </div>
</body>
</html>`;
}

/**
 * Builds the static HTML site using @rtkelly-labs/mermaid-toolkit.
 */
export function buildSite(options: BuildSiteOptions = {}): BuildManifest {
  const rootDir = path.resolve(__dirname, '..');
  const contentDir =
    options.contentDir ?? path.join(rootDir, 'site', 'content');
  const outDir = options.outDir ?? path.join(rootDir, 'temp', 'site-artifacts');
  const themeCssPath =
    options.themeCssPath ?? path.join(rootDir, 'site', 'theme.css');

  // Ensure output directory exists
  fs.mkdirSync(outDir, { recursive: true });

  // Copy theme.css
  fs.writeFileSync(
    path.join(outDir, 'theme.css'),
    fs.readFileSync(themeCssPath, 'utf-8'),
    'utf-8',
  );

  const files = fs.readdirSync(contentDir).filter((f) => f.endsWith('.md'));
  const pages: PageManifest[] = [];
  let totalSvgCount = 0;
  let totalAsciiCount = 0;

  for (const file of files) {
    const rawContent = fs.readFileSync(path.join(contentDir, file), 'utf-8');
    const outFileName = file.replace(/\.md$/, '.html');

    // Determine plugin options based on file
    const strategy = file.includes('ascii-terminal') ? 'ascii' : 'both';
    const onError = file.includes('error-handling') ? 'error' : 'code';

    const plugin = remarkMermaid({
      strategy,
      onError,
      fallbackSummary: 'Text version',
    });

    const ast = parseSimpleMarkdownToAst(rawContent);
    plugin(ast);

    // Extract page title from first h1
    const firstH1 = ast.children?.find(
      (c) => c.type === 'html' && (c.value as string).startsWith('<h1>'),
    );
    const titleMatch = firstH1
      ? (firstH1.value as string).match(/<h1>(.*?)<\/h1>/)
      : null;
    const pageTitle = titleMatch ? titleMatch[1] : outFileName;

    // Join HTML elements
    const bodyContent = (ast.children || [])
      .map((node) => node.value as string)
      .join('\n');

    const html = renderHtmlTemplate(pageTitle, bodyContent, outFileName);
    const outFilePath = path.join(outDir, outFileName);
    fs.writeFileSync(outFilePath, html, 'utf-8');

    // Count SVGs and ASCII fallbacks
    const svgMatches = html.match(/<svg\b/g) || [];
    const asciiMatches =
      html.match(/class="(?:pele-ascii-fallback|mermaid-ascii)"/g) || [];

    const pageManifest: PageManifest = {
      name: outFileName,
      title: pageTitle,
      svgCount: svgMatches.length,
      asciiCount: asciiMatches.length,
      size: Buffer.byteLength(html, 'utf-8'),
    };

    pages.push(pageManifest);
    totalSvgCount += svgMatches.length;
    totalAsciiCount += asciiMatches.length;
  }

  const manifest: BuildManifest = {
    generatedAt: new Date().toISOString(),
    pages,
    totalSvgCount,
    totalAsciiCount,
  };

  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );

  return manifest;
}

if (require.main === module) {
  console.log('Building website scaffolding...');
  const manifest = buildSite();
  console.log(
    `✓ Site build complete: ${manifest.pages.length} pages generated in temp/site-artifacts/`,
  );
  console.log(`  Total SVGs: ${manifest.totalSvgCount}`);
  console.log(`  Total ASCII diagrams: ${manifest.totalAsciiCount}`);
}
