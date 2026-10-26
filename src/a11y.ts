import { escapeHtml, hashString } from './constants';
import { parseMermaid } from './parser';
import type { FlowchartDiagram, SequenceDiagram } from './types';

export interface A11yOptions {
  /**
   * Whether automated semantic accessibility synthesis is enabled.
   * @default true
   */
  enabled?: boolean;

  /**
   * Override diagram title.
   */
  title?: string;

  /**
   * Override synthesized description.
   */
  description?: string;

  /**
   * Custom ID prefix for title and desc elements.
   * @default 'pele-a11y'
   */
  idPrefix?: string;
}

function cleanLabel(label: string): string {
  return label
    .replace(/^\((.*)\)$/, '$1')
    .replace(/^\[(.*)\]$/, '$1')
    .replace(/^\{(.*)\}$/, '$1')
    .trim();
}

/**
 * Synthesizes natural-language semantic title and description from Mermaid diagram syntax.
 */
export function synthesizeDiagramDescription(
  code: string,
  options: A11yOptions = {},
): { title: string; description: string } {
  if (options.title && options.description) {
    return { title: options.title, description: options.description };
  }

  const parsed = parseMermaid(code);

  if (!parsed) {
    const trimmed = code.trim();
    const firstLine = trimmed.split('\n')[0] || 'Diagram';
    return {
      title: options.title ?? `Diagram (${firstLine})`,
      description:
        options.description ??
        'Diagram containing visual components and flow connections.',
    };
  }

  if (parsed.type === 'flowchart') {
    const fc = parsed as FlowchartDiagram;
    const { direction, nodes, edges } = fc;

    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    for (const n of nodes) {
      inDegree.set(n.id, 0);
      outDegree.set(n.id, 0);
    }
    for (const e of edges) {
      outDegree.set(e.from, (outDegree.get(e.from) || 0) + 1);
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    }

    const startNodes = nodes.filter((n) => inDegree.get(n.id) === 0);
    const endNodes = nodes.filter((n) => outDegree.get(n.id) === 0);

    const title =
      options.title ??
      `Flowchart (${direction}) with ${nodes.length} node${nodes.length === 1 ? '' : 's'}`;

    if (options.description) {
      return { title, description: options.description };
    }

    const sentences: string[] = [
      `Flowchart oriented ${direction} containing ${nodes.length} node${nodes.length === 1 ? '' : 's'} and ${edges.length} connection${edges.length === 1 ? '' : 's'}.`,
    ];

    if (startNodes.length > 0 && startNodes.length !== nodes.length) {
      const startNames = startNodes
        .map((n) => `'${cleanLabel(n.label)}'`)
        .join(', ');
      sentences.push(`Starts at ${startNames}.`);
    }

    for (const e of edges) {
      const fromNode = nodes.find((n) => n.id === e.from);
      const toNode = nodes.find((n) => n.id === e.to);
      const fromLabel = `'${cleanLabel(fromNode?.label || e.from)}'`;
      const toLabel = `'${cleanLabel(toNode?.label || e.to)}'`;
      const via = e.label ? ` via "${e.label}"` : '';
      sentences.push(`${fromLabel} connects to ${toLabel}${via}.`);
    }

    if (endNodes.length > 0 && endNodes.length !== nodes.length) {
      const endNames = endNodes
        .map((n) => `'${cleanLabel(n.label)}'`)
        .join(', ');
      sentences.push(`Terminates at ${endNames}.`);
    }

    return { title, description: sentences.join(' ') };
  }

  if (parsed.type === 'sequence') {
    const seq = parsed as SequenceDiagram;
    const title =
      options.title ??
      `Sequence diagram with ${seq.participants.length} participant${seq.participants.length === 1 ? '' : 's'}`;

    if (options.description) {
      return { title, description: options.description };
    }

    const participantList = seq.participants
      .map((p) => `'${p.label || p.id}'`)
      .join(' and ');
    const sentences: string[] = [
      `Sequence diagram involving ${seq.participants.length} participant${seq.participants.length === 1 ? '' : 's'}: ${participantList}.`,
    ];

    for (let i = 0; i < seq.messages.length; i++) {
      const m = seq.messages[i];
      sentences.push(
        `Step ${i + 1}: '${m.from}' sends "${m.label}" to '${m.to}'.`,
      );
    }

    return { title, description: sentences.join(' ') };
  }

  return {
    title: options.title ?? 'Diagram',
    description:
      options.description ??
      'Diagram containing visual layout components and connections.',
  };
}

/**
 * Enhances SVG markup with accessible WCAG 2.1 AA compliant <title> and <desc> elements
 * and links them to root aria-labelledby and aria-describedby attributes.
 */
export function enhanceSvgA11y(
  svg: string,
  code: string,
  options: A11yOptions = {},
): string {
  if (options.enabled === false) {
    return svg;
  }

  const { title, description } = synthesizeDiagramDescription(code, options);
  const prefix = options.idPrefix ?? 'pele-a11y';
  const hash = hashString(code || svg);
  const titleId = `${prefix}-title-${hash}`;
  const descId = `${prefix}-desc-${hash}`;

  const titleElement = `<title id="${titleId}">${escapeHtml(title)}</title>`;
  const descElement = `<desc id="${descId}">${escapeHtml(description)}</desc>`;

  // Inject aria-labelledby and aria-describedby into the root <svg> element
  return svg.replace(/<svg\b([^>]*)>/i, (_match, rawAttrs) => {
    // Avoid duplicate attributes if already present
    let attrs = rawAttrs;
    if (!attrs.includes('aria-labelledby=')) {
      attrs += ` aria-labelledby="${titleId}"`;
    }
    if (!attrs.includes('aria-describedby=')) {
      attrs += ` aria-describedby="${descId}"`;
    }
    return `<svg${attrs}>${titleElement}${descElement}`;
  });
}
