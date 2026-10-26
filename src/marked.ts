import { generateDiagramHtml, type RemarkMermaidOptions } from './mdx';

export type MarkedMermaidOptions = RemarkMermaidOptions;

export interface MarkedCodeToken {
  text: string;
  lang?: string;
  raw?: string;
}

/**
 * Marked extension for static Mermaid rendering powered by Pele.
 * Works seamlessly with marked.parse() at build time or during SSR.
 */
export function markedMermaid(options: MarkedMermaidOptions = {}) {
  const mergedOptions = {
    strategy: options.strategy ?? 'both',
    className: options.className ?? 'mermaid-diagram',
    fallbackSummary: options.fallbackSummary ?? 'Text diagram',
    onError: options.onError ?? 'code',
    lightbox: options.lightbox,
    links: options.links,
    a11y: options.a11y,
  };

  const languages = options.languages ?? ['mermaid', 'pele'];

  return {
    renderer: {
      code(arg1: MarkedCodeToken | string, arg2?: string): string | false {
        let code = '';
        let lang = '';

        if (typeof arg1 === 'object' && arg1 !== null) {
          code = arg1.text || '';
          lang = (arg1.lang || '').trim().toLowerCase();
        } else {
          code = typeof arg1 === 'string' ? arg1 : '';
          lang = (typeof arg2 === 'string' ? arg2 : '').trim().toLowerCase();
        }

        const isMermaid = languages.some((l) =>
          lang.startsWith(l.toLowerCase()),
        );
        if (!isMermaid) {
          return false;
        }

        const result = generateDiagramHtml(code, mergedOptions);
        if (!result.success) {
          return false;
        }

        return result.html;
      },
    },
  };
}
