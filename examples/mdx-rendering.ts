/**
 * Static SVG rendering via Pele and MDX remark plugin example.
 *
 * Run with: `pnpm tsx examples/mdx-rendering.ts`
 */
import { type MdastNode, remarkMermaid, renderSvg } from '../src/index';

const diagram = `graph LR
  A[Client] --> B[API]
  B --> C[Database]`;

console.log('# 1. Render Static SVG (via Pele)\n');
const result = renderSvg(diagram);
console.log(`Type: ${result.type}`);
console.log(`Dimensions: ${result.width}x${result.height}`);
console.log(`SVG preview (first 100 chars): ${result.svg.slice(0, 100)}...\n`);

console.log('# 2. Remark Plugin Transformation\n');
const markdownAst: MdastNode = {
  type: 'root',
  children: [
    {
      type: 'code',
      lang: 'mermaid',
      value: diagram,
    },
  ],
};

const plugin = remarkMermaid({ strategy: 'both' });
plugin(markdownAst);

console.log('Transformed HTML output:\n');
const firstChild = markdownAst.children?.[0];
console.log(firstChild?.value);
