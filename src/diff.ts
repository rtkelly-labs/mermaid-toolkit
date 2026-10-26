import { parseMermaid } from './parser';
import { type RenderSvgOptions, type RenderSvgResult, renderSvg } from './svg';
import type { FlowchartDiagram } from './types';

export interface DiagramDiffState {
  /** Node or edge IDs that have been added */
  added?: string[];
  /** Node or edge IDs that have been removed */
  removed?: string[];
  /** Node or edge IDs that have been modified */
  modified?: string[];
}

export interface DiagramDiffResult {
  /** Added node IDs */
  added: string[];
  /** Removed node IDs */
  removed: string[];
  /** Modified node IDs */
  modified: string[];
  /** Synthesized unified Mermaid diagram code representing before and after */
  unifiedCode: string;
  /** Rendered SVG with .pele-diff-* classes applied */
  svg: string;
}

/**
 * Injects .pele-diff-added, .pele-diff-removed, and .pele-diff-modified CSS classes
 * into matching SVG node and edge elements based on their data-id attributes.
 */
export function applyDiffClasses(svg: string, diff: DiagramDiffState): string {
  const added = new Set(diff.added || []);
  const removed = new Set(diff.removed || []);
  const modified = new Set(diff.modified || []);

  if (added.size === 0 && removed.size === 0 && modified.size === 0) {
    return svg;
  }

  return svg.replace(
    /(<g\b[^>]*\bclass=")([^"]*)("[^>]*\bdata-id="([^"]*)")/gi,
    (_match, p1, cls, p2, id) => {
      let diffClass = '';

      if (added.has(id)) {
        diffClass = ' pele-diff-added';
      } else if (removed.has(id)) {
        diffClass = ' pele-diff-removed';
      } else if (modified.has(id)) {
        diffClass = ' pele-diff-modified';
      } else if (id.startsWith('L_')) {
        // Pele edge ID format: L_FROM_TO_INDEX
        const parts = id.split('_');
        const from = parts[1];
        const to = parts[2];
        if (added.has(id) || added.has(from) || added.has(to)) {
          diffClass = ' pele-diff-added';
        } else if (removed.has(id) || removed.has(from) || removed.has(to)) {
          diffClass = ' pele-diff-removed';
        } else if (modified.has(id)) {
          diffClass = ' pele-diff-modified';
        }
      }

      return `${p1}${cls}${diffClass}${p2}`;
    },
  );
}

/**
 * Computes topological differences between two flowcharts and synthesizes a unified diff diagram.
 */
function diffFlowcharts(
  before: FlowchartDiagram,
  after: FlowchartDiagram,
): {
  added: string[];
  removed: string[];
  modified: string[];
  unifiedCode: string;
} {
  const beforeNodeMap = new Map(before.nodes.map((n) => [n.id, n]));
  const afterNodeMap = new Map(after.nodes.map((n) => [n.id, n]));

  const addedNodes: string[] = [];
  const removedNodes: string[] = [];
  const modifiedNodes: string[] = [];

  // Check added & modified nodes
  for (const [id, afterNode] of afterNodeMap.entries()) {
    const beforeNode = beforeNodeMap.get(id);
    if (!beforeNode) {
      addedNodes.push(id);
    } else if (beforeNode.label !== afterNode.label) {
      modifiedNodes.push(id);
    }
  }

  // Check removed nodes
  for (const id of beforeNodeMap.keys()) {
    if (!afterNodeMap.has(id)) {
      removedNodes.push(id);
    }
  }

  // Synthesize unified Mermaid code
  const direction = after.direction || before.direction || 'LR';
  const lines: string[] = [`flowchart ${direction}`];

  // Include all current edges from 'after'
  for (const edge of after.edges) {
    const fromNode = afterNodeMap.get(edge.from);
    const toNode = afterNodeMap.get(edge.to);
    const fromLabel = fromNode?.label ? `[${fromNode.label}]` : '';
    const toLabel = toNode?.label ? `[${toNode.label}]` : '';
    const via = edge.label ? `|${edge.label}|` : '';
    lines.push(`    ${edge.from}${fromLabel} -->${via} ${edge.to}${toLabel}`);
  }

  // Append removed nodes & edges from 'before' that don't exist in 'after'
  for (const edge of before.edges) {
    const isRemoved =
      removedNodes.includes(edge.from) || removedNodes.includes(edge.to);
    if (isRemoved) {
      const fromNode = beforeNodeMap.get(edge.from);
      const toNode = beforeNodeMap.get(edge.to);
      const fromLabel = fromNode?.label ? `[${fromNode.label}]` : '';
      const toLabel = toNode?.label ? `[${toNode.label}]` : '';
      const via = edge.label ? `|${edge.label}|` : '';
      lines.push(
        `    ${edge.from}${fromLabel} -.->${via} ${edge.to}${toLabel}`,
      );
    }
  }

  return {
    added: addedNodes,
    removed: removedNodes,
    modified: modifiedNodes,
    unifiedCode: lines.join('\n'),
  };
}

/**
 * Compares two Mermaid diagram code strings, analyzes structural diffs,
 * and returns the diff state, unified diagram code, and rendered SVG with diff overlays.
 */
export function diffDiagrams(
  beforeCode: string,
  afterCode: string,
): DiagramDiffResult {
  const beforeParsed = parseMermaid(beforeCode);
  const afterParsed = parseMermaid(afterCode);

  let added: string[] = [];
  let removed: string[] = [];
  let modified: string[] = [];
  let unifiedCode = afterCode;

  if (
    beforeParsed &&
    afterParsed &&
    beforeParsed.type === 'flowchart' &&
    afterParsed.type === 'flowchart'
  ) {
    const diff = diffFlowcharts(
      beforeParsed as FlowchartDiagram,
      afterParsed as FlowchartDiagram,
    );
    added = diff.added;
    removed = diff.removed;
    modified = diff.modified;
    unifiedCode = diff.unifiedCode;
  }

  const { svg } = renderSvg(unifiedCode);
  const diffSvg = applyDiffClasses(svg, { added, removed, modified });

  return {
    added,
    removed,
    modified,
    unifiedCode,
    svg: diffSvg,
  };
}

/**
 * High-level helper to render a visual diff diagram from before and after code strings.
 */
export function renderDiffDiagram(
  beforeCode: string,
  afterCode: string,
  _options: RenderSvgOptions = {},
): RenderSvgResult & { diff: DiagramDiffState } {
  const result = diffDiagrams(beforeCode, afterCode);
  return {
    svg: result.svg,
    width: 0,
    height: 0,
    type: 'flowchart',
    diff: {
      added: result.added,
      removed: result.removed,
      modified: result.modified,
    },
  };
}
