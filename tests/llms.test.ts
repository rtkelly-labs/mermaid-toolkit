import { describe, expect, it } from 'vitest';
import {
  generateLlmsFullTxt,
  generateLlmsIndex,
  remarkLlms,
  transformMarkdownForLlms,
} from '../src/index';
import type { MdastNode } from '../src/mdx';

describe('LLMs.txt & Agentic Documentation Pipeline (Issue #47)', () => {
  const sampleMarkdown = `# System Overview

This document describes the banking pipeline.

\`\`\`mermaid
flowchart LR
    Client[Web Client] --> Gateway[API Gateway]
    Gateway --> Auth[Auth Service]
\`\`\`

Here is sample configuration code:

\`\`\`typescript
export const config = { port: 8080 };
\`\`\`
`;

  describe('transformMarkdownForLlms', () => {
    it('replaces mermaid diagram blocks with text ASCII diagrams', () => {
      const output = transformMarkdownForLlms(sampleMarkdown);

      expect(output).toContain('# System Overview');
      expect(output).toContain('> [Diagram (Text Representation)]');
      expect(output).toContain('```text');
      // Box drawing characters
      expect(output).toContain('Web Client');
      expect(output).toContain('API Gateway');
      expect(output).toContain('Auth Service');
      // Keeps unrelated code block untouched
      expect(output).toContain(
        '```typescript\nexport const config = { port: 8080 };\n```',
      );
      // No raw mermaid code block left
      expect(output).not.toContain('```mermaid');
    });

    it('supports custom diagram header and includeRawSource', () => {
      const output = transformMarkdownForLlms(sampleMarkdown, {
        diagramHeader: 'Architecture Flowchart',
        includeRawSource: true,
      });

      expect(output).toContain('> Architecture Flowchart');
      expect(output).toContain(
        '<details>\n<summary>Original Diagram Source</summary>',
      );
      expect(output).toContain('```mermaid\nflowchart LR');
    });
  });

  describe('remarkLlms Plugin', () => {
    it('transforms AST code nodes of lang "mermaid" into ASCII blocks', () => {
      const ast: MdastNode = {
        type: 'root',
        children: [
          {
            type: 'heading',
            depth: 1,
            children: [{ type: 'text', value: 'Architecture' }],
          },
          {
            type: 'code',
            lang: 'mermaid',
            value: 'graph TD\n  A --> B',
          },
          {
            type: 'code',
            lang: 'bash',
            value: 'echo "hello"',
          },
        ],
      };

      const plugin = remarkLlms();
      plugin(ast);

      expect(ast.children).toBeDefined();
      // Should replace mermaid node with blockquote and text code node
      const langs = (ast.children || [])
        .filter((c) => c.type === 'code')
        .map((c) => c.lang);

      expect(langs).toContain('text');
      expect(langs).toContain('bash');
      expect(langs).not.toContain('mermaid');
    });
  });

  describe('generateLlmsFullTxt', () => {
    it('combines multiple markdown files into a single full text corpus', () => {
      const files = [
        {
          path: 'docs/overview.md',
          title: 'System Architecture',
          content: sampleMarkdown,
        },
        {
          path: 'docs/api.md',
          title: 'REST API',
          content: '# API\n\n```mermaid\ngraph LR\n  GET --> Handler\n```',
        },
      ];

      const fullText = generateLlmsFullTxt(files);

      expect(fullText).toContain('# System Architecture');
      expect(fullText).toContain('Source: docs/overview.md');
      expect(fullText).toContain('# REST API');
      expect(fullText).toContain('Source: docs/api.md');
      expect(fullText).not.toContain('```mermaid');
      expect(fullText).toContain('```text');
    });
  });

  describe('generateLlmsIndex', () => {
    it('generates standard /llms.txt index markdown', () => {
      const manifest = {
        title: 'Mermaid Toolkit Documentation',
        description:
          'Lightweight zero-runtime-JS Mermaid renderer powered by Pele.',
        sections: [
          {
            title: 'Core Concepts',
            links: [
              {
                title: 'Architecture',
                url: 'https://docs.example.com/arch',
                description: 'System design and components',
              },
            ],
          },
        ],
        optionalSections: [
          {
            title: 'Optional',
            links: [
              {
                title: 'Complete Text Corpus',
                url: 'https://docs.example.com/llms-full.txt',
              },
            ],
          },
        ],
      };

      const llmsTxt = generateLlmsIndex(manifest);

      expect(llmsTxt).toContain('# Mermaid Toolkit Documentation');
      expect(llmsTxt).toContain(
        '> Lightweight zero-runtime-JS Mermaid renderer powered by Pele.',
      );
      expect(llmsTxt).toContain('## Core Concepts');
      expect(llmsTxt).toContain(
        '- [Architecture](https://docs.example.com/arch): System design and components',
      );
      expect(llmsTxt).toContain('## Optional');
      expect(llmsTxt).toContain(
        '- [Complete Text Corpus](https://docs.example.com/llms-full.txt)',
      );
    });
  });
});
