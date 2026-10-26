import { mermaidToAscii } from './index';
import type { MdastNode } from './mdx';
import type { AsciiOptions } from './types';

export interface TransformLlmsOptions {
  /**
   * Options passed to mermaidToAscii.
   */
  asciiOptions?: AsciiOptions;
  /**
   * Header text placed above the ASCII diagram block.
   * @default '[Diagram (Text Representation)]'
   */
  diagramHeader?: string;
  /**
   * Languages to treat as Mermaid diagrams.
   * @default ['mermaid', 'pele']
   */
  languages?: string[];
  /**
   * Whether to retain the original Mermaid syntax block after the ASCII block.
   * Useful when models benefit from both textual syntax and spatial layout.
   * @default false
   */
  includeRawSource?: boolean;
}

export interface LlmsDocFile {
  title?: string;
  path: string;
  content: string;
}

export interface LlmsLinkItem {
  title: string;
  url: string;
  description?: string;
}

export interface LlmsIndexSection {
  title: string;
  description?: string;
  links: LlmsLinkItem[];
}

export interface LlmsManifestOptions {
  title: string;
  description: string;
  sections: LlmsIndexSection[];
  optionalSections?: LlmsIndexSection[];
}

/**
 * Transforms Markdown content for ingestion by LLMs and automated agents.
 * Replaces visual Mermaid and Pele diagram code blocks with spatial ASCII / Unicode
 * box-drawing representations that models can parse semantically.
 */
export function transformMarkdownForLlms(
  markdown: string,
  options: TransformLlmsOptions = {},
): string {
  const languages = options.languages ?? ['mermaid', 'pele'];
  const diagramHeader =
    options.diagramHeader ?? '[Diagram (Text Representation)]';
  const includeRaw = options.includeRawSource ?? false;

  const langPattern = languages.map((l) => l.toLowerCase()).join('|');
  const codeBlockRegex = new RegExp(
    `\`\`\`(${langPattern})\\b([\\s\\S]*?)\`\`\``,
    'gi',
  );

  return markdown.replace(
    codeBlockRegex,
    (_fullMatch, lang: string, rawCode: string) => {
      const code = rawCode.trim();
      const ascii = mermaidToAscii(code, options.asciiOptions);

      let replacement = `> ${diagramHeader}\n\`\`\`text\n${ascii}\n\`\`\``;

      if (includeRaw) {
        replacement += `\n\n<details>\n<summary>Original Diagram Source</summary>\n\n\`\`\`${lang}\n${code}\n\`\`\`\n</details>`;
      }

      return replacement;
    },
  );
}

/**
 * Remark plugin for unified MDX/Markdown pipelines targeting LLM export.
 * Replaces ```mermaid code AST nodes with text/code blocks containing ASCII diagrams.
 */
export function remarkLlms(options: TransformLlmsOptions = {}) {
  const languages = options.languages ?? ['mermaid', 'pele'];
  const diagramHeader =
    options.diagramHeader ?? '[Diagram (Text Representation)]';
  const includeRaw = options.includeRawSource ?? false;

  return (tree: MdastNode) => {
    function visit(node: MdastNode) {
      if (!node.children || !Array.isArray(node.children)) {
        return;
      }

      const newChildren: MdastNode[] = [];

      for (const child of node.children) {
        if (child.type === 'code' && child.lang) {
          const lang = child.lang.toLowerCase();
          const isMermaid = languages.some((l) => l.toLowerCase() === lang);

          if (isMermaid && typeof child.value === 'string') {
            const code = child.value.trim();
            const ascii = mermaidToAscii(code, options.asciiOptions);

            newChildren.push({
              type: 'blockquote',
              children: [
                {
                  type: 'paragraph',
                  children: [{ type: 'text', value: diagramHeader }],
                },
              ],
            });

            newChildren.push({
              type: 'code',
              lang: 'text',
              value: ascii,
            });

            if (includeRaw) {
              newChildren.push({
                type: 'html',
                value: `<details><summary>Original Diagram Source</summary>\n\n\`\`\`${lang}\n${code}\n\`\`\`\n</details>`,
              });
            }
            continue;
          }
        }

        visit(child);
        newChildren.push(child);
      }

      node.children = newChildren;
    }

    visit(tree);
  };
}

/**
 * Generates a consolidated llms-full.txt corpus from an array of documentation files.
 * Transforms all visual diagrams into readable ASCII text representations.
 */
export function generateLlmsFullTxt(
  files: LlmsDocFile[],
  options: TransformLlmsOptions = {},
): string {
  const fileBlocks: string[] = [];

  for (const file of files) {
    const transformed = transformMarkdownForLlms(file.content, options);
    const title = file.title || file.path;

    fileBlocks.push(
      `---\n# ${title}\nSource: ${file.path}\n---\n\n${transformed.trim()}`,
    );
  }

  return fileBlocks.join('\n\n\n');
}

/**
 * Generates an /llms.txt standard index document.
 */
export function generateLlmsIndex(manifest: LlmsManifestOptions): string {
  const lines: string[] = [];

  lines.push(`# ${manifest.title}`);
  lines.push('');
  lines.push(`> ${manifest.description}`);
  lines.push('');

  for (const section of manifest.sections) {
    lines.push(`## ${section.title}`);
    if (section.description) {
      lines.push(`${section.description}`);
      lines.push('');
    }
    for (const link of section.links) {
      const desc = link.description ? `: ${link.description}` : '';
      lines.push(`- [${link.title}](${link.url})${desc}`);
    }
    lines.push('');
  }

  if (manifest.optionalSections && manifest.optionalSections.length > 0) {
    for (const section of manifest.optionalSections) {
      lines.push(`## ${section.title}`);
      if (section.description) {
        lines.push(`${section.description}`);
        lines.push('');
      }
      for (const link of section.links) {
        const desc = link.description ? `: ${link.description}` : '';
        lines.push(`- [${link.title}](${link.url})${desc}`);
      }
      lines.push('');
    }
  }

  return `${lines.join('\n').trim()}\n`;
}
