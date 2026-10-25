import { type RemarkMermaidOptions, remarkMermaid } from './mdx';

/**
 * Astro integration helper for @rtkelly-labs/mermaid-toolkit.
 * Injects remarkMermaid into Astro markdown configuration.
 */
export function createAstroMermaidIntegration(
  options: RemarkMermaidOptions = {},
) {
  return {
    name: '@rtkelly-labs/mermaid-toolkit',
    hooks: {
      'astro:config:setup': ({
        updateConfig,
      }: {
        updateConfig: (config: Record<string, unknown>) => void;
      }) => {
        updateConfig({
          markdown: {
            remarkPlugins: [[remarkMermaid, options]],
          },
        });
      },
    },
  };
}

/**
 * Vite plugin helper for @rtkelly-labs/mermaid-toolkit.
 * Provides unified remark plugin configuration for Vite MDX pipelines.
 */
export function createViteMermaidPlugin(options: RemarkMermaidOptions = {}) {
  return {
    name: 'vite-plugin-mermaid-toolkit',
    enforce: 'pre' as const,
    config: () => ({
      optimizeDeps: {
        include: ['@rtkelly-labs/mermaid-toolkit'],
      },
    }),
    remarkPlugins: [remarkMermaid(options)],
  };
}

/**
 * Next.js MDX configuration helper for next.config.mjs.
 */
export function getNextMdxPlugins(options: RemarkMermaidOptions = {}) {
  return {
    remarkPlugins: [[remarkMermaid, options]],
    rehypePlugins: [],
  };
}
