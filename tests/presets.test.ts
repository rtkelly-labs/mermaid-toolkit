import { describe, expect, it, vi } from 'vitest';
import {
  createAstroMermaidIntegration,
  createViteMermaidPlugin,
  getNextMdxPlugins,
} from '../src/index';

describe('Framework Presets (Issue #44)', () => {
  describe('Astro Integration', () => {
    it('creates an Astro integration object with setup hook', () => {
      const integration = createAstroMermaidIntegration({ strategy: 'both' });

      expect(integration.name).toBe('@rtkelly-labs/mermaid-toolkit');
      expect(integration.hooks).toHaveProperty('astro:config:setup');

      const updateConfig = vi.fn();
      integration.hooks['astro:config:setup']({ updateConfig });

      expect(updateConfig).toHaveBeenCalledOnce();
      const passedConfig = updateConfig.mock.calls[0][0];
      expect(passedConfig).toHaveProperty('markdown');
      expect(passedConfig.markdown.remarkPlugins).toHaveLength(1);
    });
  });

  describe('Vite Plugin', () => {
    it('creates a Vite plugin with remarkPlugins and optimizeDeps', () => {
      const plugin = createViteMermaidPlugin({ strategy: 'svg' });

      expect(plugin.name).toBe('vite-plugin-mermaid-toolkit');
      expect(plugin.enforce).toBe('pre');
      expect(plugin.remarkPlugins).toHaveLength(1);

      const config = plugin.config();
      expect(config.optimizeDeps.include).toContain(
        '@rtkelly-labs/mermaid-toolkit',
      );
    });
  });

  describe('Next.js MDX Helper', () => {
    it('returns remarkPlugins configured with remarkMermaid', () => {
      const plugins = getNextMdxPlugins({ strategy: 'both' });

      expect(plugins).toHaveProperty('remarkPlugins');
      expect(plugins.remarkPlugins).toHaveLength(1);
      expect(plugins.rehypePlugins).toEqual([]);
    });
  });
});
