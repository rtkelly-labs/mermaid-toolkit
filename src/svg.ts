import { render as peleRender } from 'pele';

export interface RenderSvgOptions {
  /**
   * Additional CSS class name to append to the root SVG element.
   */
  className?: string;
  /**
   * Custom ID attribute for the root SVG element.
   */
  id?: string;
}

export interface RenderSvgResult {
  /**
   * The generated SVG markup string.
   */
  svg: string;
  /**
   * Intrinsic diagram width in pixels.
   */
  width: number;
  /**
   * Intrinsic diagram height in pixels.
   */
  height: number;
  /**
   * Diagram type detected by Pele (e.g., 'flowchart').
   */
  type: string;
  /**
   * Mermaid syntax flavor detected (e.g., 'flowchart-v2').
   */
  mermaidType?: string;
  /**
   * Error message if rendering failed.
   */
  error?: string;
}

function sanitizeAttr(val: string): string {
  return val.replace(/["'<>&]/g, '').trim();
}

/**
 * Render Mermaid diagram code directly into theme-aware SVG using Pele.
 *
 * @param code - The Mermaid diagram source code.
 * @param options - Custom rendering options (e.g. className, id).
 * @returns RenderSvgResult containing the SVG markup and metadata.
 */
export function renderSvg(
  code: string,
  options: RenderSvgOptions = {},
): RenderSvgResult {
  try {
    const result = peleRender(code.trim());
    let svg = result.svg;

    if (options.className) {
      const safeClass = sanitizeAttr(options.className);
      if (safeClass) {
        if (svg.includes('class="')) {
          svg = svg.replace('class="', `class="${safeClass} `);
        } else {
          svg = svg.replace('<svg ', `<svg class="${safeClass}" `);
        }
      }
    }
    if (options.id) {
      const safeId = sanitizeAttr(options.id);
      if (safeId) {
        svg = svg.replace('<svg ', `<svg id="${safeId}" `);
      }
    }

    return {
      svg,
      width: result.width,
      height: result.height,
      type: result.type,
      mermaidType: result.mermaidType,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown rendering error';
    return {
      svg: '',
      width: 0,
      height: 0,
      type: 'error',
      error: message,
    };
  }
}
