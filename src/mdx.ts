import { type A11yOptions, enhanceSvgA11y } from './a11y';
import { escapeHtml } from './constants';
import { mermaidToAscii } from './index';
import { type LightboxOptions, renderLightbox } from './lightbox';
import { enhanceSvgLinks, type LinkOptions } from './links';
import { renderSvg } from './svg';

export type { A11yOptions } from './a11y';
export type { LightboxOptions } from './lightbox';
export type { LinkOptions } from './links';

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

  /**
   * Zero-JS lightbox modal configuration.
   * If true or configured with options, wraps SVGs with pure CSS / HTML5 Popover modal.
   * @default false
   */
  lightbox?: boolean | LightboxOptions;

  /**
   * Link configuration for diagram nodes (`click` / URL elements).
   * Configures external targets, rel attributes, and router link attributes.
   */
  links?: LinkOptions;

  /**
   * Automated semantic accessibility (ARIA) configuration.
   * Synthesizes WCAG 2.1 AA compliant <title>, <desc>, aria-labelledby, and aria-describedby.
   * @default true
   */
  a11y?: boolean | A11yOptions;
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

  /**
   * Zero-JS lightbox modal configuration.
   * If true or configured with options, wraps SVGs with pure CSS / HTML5 Popover modal.
   * @default false
   */
  lightbox?: boolean | LightboxOptions;

  /**
   * Link configuration for diagram nodes (`click` / URL elements).
   * Configures external targets, rel attributes, and router link attributes.
   */
  links?: LinkOptions;

  /**
   * Automated semantic accessibility (ARIA) configuration.
   * Synthesizes WCAG 2.1 AA compliant <title>, <desc>, aria-labelledby, and aria-describedby.
   * @default true
   */
  a11y?: boolean | A11yOptions;
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

export function generateDiagramHtml(
  code: string,
  options: Required<
    Pick<
      RemarkMermaidOptions,
      'strategy' | 'className' | 'fallbackSummary' | 'onError'
    >
  > &
    Pick<RemarkMermaidOptions, 'lightbox' | 'links' | 'a11y'>,
): { html: string; success: boolean } {
  const {
    strategy,
    className,
    fallbackSummary,
    onError,
    lightbox,
    links,
    a11y,
  } = options;
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

  let svg = svgResult.svg;
  if (a11y !== false) {
    const a11yConfig = typeof a11y === 'object' && a11y !== null ? a11y : {};
    svg = enhanceSvgA11y(svg, code, a11yConfig);
  }
  if (links) {
    svg = enhanceSvgLinks(svg, links);
  }

  const hasLightbox = Boolean(
    lightbox === true ||
      (typeof lightbox === 'object' &&
        lightbox !== null &&
        lightbox.enabled !== false),
  );

  const lightboxConfig =
    typeof lightbox === 'object' && lightbox !== null ? lightbox : {};

  if (strategy === 'svg') {
    if (hasLightbox) {
      const { wrapperHtml } = renderLightbox(svg, lightboxConfig, code);
      return {
        html: `<div class="${safeClassName} pele-container pele-has-lightbox">${wrapperHtml}</div>`,
        success: true,
      };
    }
    return {
      html: `<div class="${safeClassName} pele-container">${svg}</div>`,
      success: true,
    };
  }

  // strategy === 'both'
  const ascii = mermaidToAscii(code);
  if (hasLightbox) {
    const { wrapperHtml } = renderLightbox(svg, lightboxConfig, code);
    const html = `<figure class="${safeClassName} pele-container pele-has-lightbox">
  ${wrapperHtml}
  <details class="pele-ascii-fallback">
    <summary>${escapeHtml(fallbackSummary)}</summary>
    <pre><code>${escapeHtml(ascii)}</code></pre>
  </details>
</figure>`;
    return { html, success: true };
  }

  const html = `<figure class="${safeClassName} pele-container">
  <div class="pele-svg-wrapper">${svg}</div>
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
  const options = {
    strategy: userOptions.strategy ?? 'both',
    className: userOptions.className ?? 'mermaid-diagram',
    fallbackSummary: userOptions.fallbackSummary ?? 'Text diagram',
    languages: userOptions.languages ?? ['mermaid', 'pele'],
    onError: userOptions.onError ?? 'code',
    lightbox: userOptions.lightbox,
    links: userOptions.links,
    a11y: userOptions.a11y,
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
  const options = {
    strategy: userOptions.strategy ?? 'both',
    className: userOptions.className ?? 'mermaid-diagram',
    fallbackSummary: userOptions.fallbackSummary ?? 'Text diagram',
    languages: ['mermaid', 'pele'],
    onError: 'code' as const,
    lightbox: userOptions.lightbox,
    links: userOptions.links,
    a11y: userOptions.a11y,
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
