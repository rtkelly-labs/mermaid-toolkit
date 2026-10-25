import { mermaidToAscii } from './index';
import { renderSvg } from './svg';

export interface RemarkMermaidOptions {
  /**
   * Rendering strategy:
   * - 'svg': Render static theme-aware SVG via Pele
   * - 'ascii': Render ASCII / Unicode box-drawing text diagram
   * - 'both': Render SVG with accessible collapsible ASCII text fallback
   * @default 'both'
   */
  strategy?: 'svg' | 'ascii' | 'both';

  /**
   * Container CSS class name.
   * @default 'mermaid-diagram'
   */
  className?: string;

  /**
   * Summary text for the ASCII fallback `<details>` element (when strategy is 'both').
   * @default 'Text diagram'
   */
  fallbackSummary?: string;

  /**
   * Fenced code block languages to intercept.
   * @default ['mermaid', 'pele']
   */
  languages?: string[];

  /**
   * Behavior when SVG rendering fails (e.g. unsupported diagram type).
   * - 'code': Keep original code block
   * - 'ascii': Attempt ASCII rendering
   * - 'error': Display error message
   * @default 'code'
   */
  onError?: 'code' | 'ascii' | 'error';
}

export interface RehypeMermaidOptions {
  /**
   * Rendering strategy:
   * - 'svg': Render static theme-aware SVG via Pele
   * - 'ascii': Render ASCII text diagram
   * - 'both': Render SVG with accessible ASCII fallback
   * @default 'both'
   */
  strategy?: 'svg' | 'ascii' | 'both';

  /**
   * Container CSS class name.
   * @default 'mermaid-diagram'
   */
  className?: string;

  /**
   * Summary text for the ASCII fallback `<details>` element (when strategy is 'both').
   * @default 'Text diagram'
   */
  fallbackSummary?: string;
}

export interface MdastNode {
  type: string;
  lang?: string | null;
  value?: string;
  children?: MdastNode[];
  [key: string]: unknown;
}

export interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  value?: string;
  [key: string]: unknown;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateDiagramHtml(
  code: string,
  options: Required<
    Pick<
      RemarkMermaidOptions,
      'strategy' | 'className' | 'fallbackSummary' | 'onError'
    >
  >,
): { html: string; success: boolean } {
  const { strategy, className, fallbackSummary, onError } = options;
  const safeClassName = escapeHtml(className);

  if (strategy === 'ascii') {
    const ascii = mermaidToAscii(code);
    return {
      html: `<div class="${safeClassName} mermaid-ascii"><pre><code>${escapeHtml(ascii)}</code></pre></div>`,
      success: true,
    };
  }

  const svgResult = renderSvg(code);

  if (svgResult.error) {
    if (onError === 'ascii') {
      const ascii = mermaidToAscii(code);
      return {
        html: `<div class="${safeClassName} mermaid-ascii"><pre><code>${escapeHtml(ascii)}</code></pre></div>`,
        success: true,
      };
    }
    if (onError === 'error') {
      return {
        html: `<div class="${safeClassName} mermaid-error"><p>Failed to render diagram: ${escapeHtml(svgResult.error)}</p></div>`,
        success: true,
      };
    }
    return { html: '', success: false };
  }

  if (strategy === 'svg') {
    return {
      html: `<div class="${safeClassName} pele-container">${svgResult.svg}</div>`,
      success: true,
    };
  }

  // strategy === 'both'
  const ascii = mermaidToAscii(code);
  const html = `<figure class="${safeClassName} pele-container">
  <div class="pele-svg-wrapper">${svgResult.svg}</div>
  <details class="pele-ascii-fallback">
    <summary>${escapeHtml(fallbackSummary)}</summary>
    <pre><code>${escapeHtml(ascii)}</code></pre>
  </details>
</figure>`;

  return { html, success: true };
}

/**
 * Remark plugin for MDX / Markdown pipelines.
 * Compiles ```mermaid code blocks into static themeable SVGs (via Pele) and/or ASCII fallbacks.
 */
export function remarkMermaid(userOptions: RemarkMermaidOptions = {}) {
  const options: Required<RemarkMermaidOptions> = {
    strategy: userOptions.strategy ?? 'both',
    className: userOptions.className ?? 'mermaid-diagram',
    fallbackSummary: userOptions.fallbackSummary ?? 'Text diagram',
    languages: userOptions.languages ?? ['mermaid', 'pele'],
    onError: userOptions.onError ?? 'code',
  };

  const allowedLangs = new Set(options.languages.map((l) => l.toLowerCase()));

  return (tree: MdastNode) => {
    function walk(node: MdastNode) {
      if (!node.children || !Array.isArray(node.children)) {
        return;
      }

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        if (
          child.type === 'code' &&
          child.lang &&
          allowedLangs.has(child.lang.toLowerCase())
        ) {
          const code = child.value || '';
          const { html, success } = generateDiagramHtml(code, options);

          if (success) {
            node.children[i] = {
              type: 'html',
              value: html,
            };
          }
        } else {
          walk(child);
        }
      }
    }

    walk(tree);
  };
}

/**
 * Rehype plugin for HTML / MDX pipelines.
 * Intercepts <pre><code class="language-mermaid"> elements and transforms them into SVGs.
 */
export function rehypeMermaid(userOptions: RehypeMermaidOptions = {}) {
  const options: Required<RemarkMermaidOptions> = {
    strategy: userOptions.strategy ?? 'both',
    className: userOptions.className ?? 'mermaid-diagram',
    fallbackSummary: userOptions.fallbackSummary ?? 'Text diagram',
    languages: ['mermaid', 'pele'],
    onError: 'code',
  };

  return (tree: HastNode) => {
    function walk(node: HastNode) {
      if (!node.children || !Array.isArray(node.children)) {
        return;
      }

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        if (
          child.type === 'element' &&
          child.tagName === 'pre' &&
          child.children?.length
        ) {
          const codeElement = child.children[0];
          if (
            codeElement.type === 'element' &&
            codeElement.tagName === 'code'
          ) {
            const classNames =
              (codeElement.properties?.className as string[]) || [];
            const isMermaid = classNames.some(
              (c) =>
                typeof c === 'string' &&
                (c === 'language-mermaid' || c === 'language-pele'),
            );

            if (isMermaid) {
              const textNode = codeElement.children?.[0];
              const code = (textNode?.value as string) || '';
              const { html, success } = generateDiagramHtml(code, options);

              if (success) {
                node.children[i] = {
                  type: 'raw',
                  value: html,
                };
              }
            }
          }
        } else {
          walk(child);
        }
      }
    }

    walk(tree);
  };
}
