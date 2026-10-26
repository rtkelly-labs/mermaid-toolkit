import { escapeHtml } from './constants';
import { renderSvg } from './svg';

export interface ThemeVariables {
  /** Background color (e.g. #ffffff, #0d1117) */
  bg: string;
  /** Foreground text color (e.g. #1f1f1f, #e6edf3) */
  fg: string;
  /** Surface background for nodes / containers */
  surface: string;
  /** Alternate surface background */
  surfaceAlt?: string;
  /** Border stroke color */
  border: string;
  /** Edge line and connector color */
  line: string;
  /** Muted secondary text color */
  muted: string;
  /** Accent highlight color */
  accent: string;
  /** Corner radius */
  radius?: string;
  /** Font family */
  font?: string;
}

export type ThemePreset =
  | 'default'
  | 'github'
  | 'tailwind'
  | 'catppuccin'
  | 'nord'
  | 'retro-brutalist';

export interface RenderPngOptions {
  /** Output width in pixels */
  width?: number;
  /** Output height in pixels */
  height?: number;
  /** Device scale factor (e.g. 2 for 2x retina) */
  scale?: number;
  /** Theme preset name or custom theme variable overrides */
  theme?: ThemePreset | Partial<ThemeVariables>;
  /** Whether to apply dark mode colors (default: false) */
  darkMode?: boolean;
  /** Custom canvas background color */
  background?: string;
}

export interface OgCardOptions {
  /** Card canvas width in pixels (default: 1200) */
  width?: number;
  /** Card canvas height in pixels (default: 630) */
  height?: number;
  /** Card background color (default: theme.bg) */
  background?: string;
  /** Optional title text displayed at the top */
  title?: string;
  /** Optional subtitle or site tag displayed at the bottom */
  subtitle?: string;
  /** Theme preset name or custom theme variables */
  theme?: ThemePreset | Partial<ThemeVariables>;
  /** Whether to apply dark mode colors (default: true for OG cards) */
  darkMode?: boolean;
  /** Padding around the diagram in pixels (default: 60) */
  padding?: number;
}

const THEMES: Record<
  ThemePreset,
  { light: ThemeVariables; dark: ThemeVariables }
> = {
  default: {
    light: {
      bg: '#ffffff',
      fg: '#1f1f1f',
      surface: '#f3f3f3',
      surfaceAlt: '#e6e6e6',
      border: '#8a8a8a',
      line: '#1f1f1f',
      muted: '#6e6e6e',
      accent: '#5b7bd5',
      radius: '4px',
    },
    dark: {
      bg: '#1a1a1a',
      fg: '#e0e0e0',
      surface: '#282828',
      surfaceAlt: '#353535',
      border: '#505050',
      line: '#e0e0e0',
      muted: '#a0a0a0',
      accent: '#7c9bf0',
      radius: '4px',
    },
  },
  github: {
    light: {
      bg: '#ffffff',
      fg: '#1f2328',
      surface: '#f6f8fa',
      surfaceAlt: '#eaeef2',
      border: '#d0d7de',
      line: '#1f2328',
      muted: '#656d76',
      accent: '#0969da',
      radius: '6px',
    },
    dark: {
      bg: '#0d1117',
      fg: '#e6edf3',
      surface: '#161b22',
      surfaceAlt: '#21262d',
      border: '#30363d',
      line: '#e6edf3',
      muted: '#848d97',
      accent: '#2f81f7',
      radius: '6px',
    },
  },
  catppuccin: {
    light: {
      bg: '#eff1f5',
      fg: '#4c4f69',
      surface: '#e6e9ef',
      surfaceAlt: '#dce0e8',
      border: '#ccd0da',
      line: '#4c4f69',
      muted: '#6c6f85',
      accent: '#1e66f5',
      radius: '8px',
    },
    dark: {
      bg: '#1e1e2e',
      fg: '#cdd6f4',
      surface: '#313244',
      surfaceAlt: '#45475a',
      border: '#45475a',
      line: '#cdd6f4',
      muted: '#9399b2',
      accent: '#89b4fa',
      radius: '8px',
    },
  },
  nord: {
    light: {
      bg: '#eceff4',
      fg: '#2e3440',
      surface: '#e5e9f0',
      surfaceAlt: '#d8dee9',
      border: '#d8dee9',
      line: '#2e3440',
      muted: '#4c566a',
      accent: '#5e81ac',
      radius: '4px',
    },
    dark: {
      bg: '#2e3440',
      fg: '#eceff4',
      surface: '#3b4252',
      surfaceAlt: '#434c5e',
      border: '#4c566a',
      line: '#eceff4',
      muted: '#d8dee9',
      accent: '#88c0d0',
      radius: '4px',
    },
  },
  tailwind: {
    light: {
      bg: '#ffffff',
      fg: '#0f172a',
      surface: '#f1f5f9',
      surfaceAlt: '#e2e8f0',
      border: '#cbd5e1',
      line: '#0f172a',
      muted: '#64748b',
      accent: '#3b82f6',
      radius: '6px',
    },
    dark: {
      bg: '#0f172a',
      fg: '#f8fafc',
      surface: '#1e293b',
      surfaceAlt: '#334155',
      border: '#334155',
      line: '#f8fafc',
      muted: '#94a3b8',
      accent: '#60a5fa',
      radius: '6px',
    },
  },
  'retro-brutalist': {
    light: {
      bg: '#fffdf0',
      fg: '#000000',
      surface: '#ffeb3b',
      surfaceAlt: '#ffd54f',
      border: '#000000',
      line: '#000000',
      muted: '#444444',
      accent: '#ff5722',
      radius: '0px',
    },
    dark: {
      bg: '#121212',
      fg: '#ffffff',
      surface: '#ff5722',
      surfaceAlt: '#f4511e',
      border: '#ffffff',
      line: '#ffffff',
      muted: '#cccccc',
      accent: '#ffeb3b',
      radius: '0px',
    },
  },
};

/**
 * Resolves full concrete ThemeVariables from preset name or custom overrides.
 */
export function getThemeVariables(
  theme: ThemePreset | Partial<ThemeVariables> = 'default',
  darkMode = false,
): ThemeVariables {
  const modeKey = darkMode ? 'dark' : 'light';
  if (typeof theme === 'string' && theme in THEMES) {
    return { ...THEMES[theme][modeKey] };
  }

  const base = THEMES.default[modeKey];
  if (typeof theme === 'object' && theme !== null) {
    return { ...base, ...theme };
  }

  return { ...base };
}

/**
 * Resolves and inlines CSS custom properties in Pele SVG output with concrete color values.
 * Required for headless SVG rasterizers (like resvg / usvg) that do not evaluate runtime CSS variables.
 */
export function resolveSvgTheme(
  svg: string,
  theme: ThemePreset | Partial<ThemeVariables> = 'default',
  darkMode = false,
): string {
  const vars = getThemeVariables(theme, darkMode);

  return svg
    .replace(/--_bg:var\(--pele-bg,[^)]+\);/g, `--_bg:${vars.bg};`)
    .replace(/--_fg:var\(--pele-fg,[^)]+\);/g, `--_fg:${vars.fg};`)
    .replace(/--_m:var\(--pele-muted,[^)]+\);/g, `--_m:${vars.muted};`)
    .replace(/--_l:var\(--pele-line,[^)]+\);/g, `--_l:${vars.line};`)
    .replace(/--_s:var\(--pele-surface,[^)]+\);/g, `--_s:${vars.surface};`)
    .replace(
      /--_a:var\(--pele-surface-alt,[^)]+\);/g,
      `--_a:${vars.surfaceAlt || vars.surface};`,
    )
    .replace(/--_b:var\(--pele-border,[^)]+\);/g, `--_b:${vars.border};`)
    .replace(/--_c:var\(--pele-accent,[^)]+\);/g, `--_c:${vars.accent};`)
    .replace(
      /--_r:var\(--pele-radius,[^)]+\);/g,
      `--_r:${vars.radius || '4px'};`,
    )
    .replace(/var\(--_bg(?:\s*,[^)]+)?\)/g, vars.bg)
    .replace(/var\(--_fg(?:\s*,[^)]+)?\)/g, vars.fg)
    .replace(/var\(--_s(?:\s*,[^)]+)?\)/g, vars.surface)
    .replace(/var\(--_a(?:\s*,[^)]+)?\)/g, vars.surfaceAlt || vars.surface)
    .replace(/var\(--_b(?:\s*,[^)]+)?\)/g, vars.border)
    .replace(/var\(--_l(?:\s*,[^)]+)?\)/g, vars.line)
    .replace(/var\(--_m(?:\s*,[^)]+)?\)/g, vars.muted)
    .replace(/var\(--_c(?:\s*,[^)]+)?\)/g, vars.accent)
    .replace(/var\(--_r(?:\s*,[^)]+)?\)/g, vars.radius || '4px')
    .replace(/var\(--_fm(?:\s*,[^)]+)?\)/g, 'monospace')
    .replace(
      /font-family:var\(--_font(?:\s*,[^)]+)?\)/g,
      `font-family:${vars.font || 'sans-serif'}`,
    );
}

/**
 * Dynamically imports @resvg/resvg-js to maintain optional dependency status.
 */
async function loadResvg() {
  try {
    const mod = await import('@resvg/resvg-js');
    return mod.Resvg;
  } catch {
    throw new Error(
      'The "@resvg/resvg-js" package is required for headless OG image rasterization. Please install it with: pnpm add -D @resvg/resvg-js',
    );
  }
}

/**
 * Headless SVG to PNG rasterization without Chromium or browser dependencies.
 */
export async function renderSvgToPng(
  svg: string,
  options: RenderPngOptions = {},
): Promise<Buffer> {
  const ResvgClass = await loadResvg();
  const theme = options.theme ?? 'default';
  const darkMode = options.darkMode ?? false;
  const resolvedSvg = resolveSvgTheme(svg, theme, darkMode);

  const resvgOptions: Record<string, unknown> = {
    background: options.background,
  };

  if (options.width && options.height) {
    resvgOptions.fitTo = {
      mode: 'width',
      value: options.width,
    };
  } else if (options.width) {
    resvgOptions.fitTo = {
      mode: 'width',
      value: options.width,
    };
  } else if (options.height) {
    resvgOptions.fitTo = {
      mode: 'height',
      value: options.height,
    };
  } else if (options.scale) {
    resvgOptions.fitTo = {
      mode: 'zoom',
      value: options.scale,
    };
  }

  const resvg = new ResvgClass(resolvedSvg, resvgOptions);
  return resvg.render().asPng();
}

/**
 * Compiles Mermaid code to static SVG and rasterizes directly to a PNG buffer.
 */
export async function renderMermaidToPng(
  mermaidCode: string,
  options: RenderPngOptions = {},
): Promise<Buffer> {
  const result = renderSvg(mermaidCode);
  if (result.error) {
    throw new Error(`Failed to compile Mermaid diagram: ${result.error}`);
  }
  return renderSvgToPng(result.svg, options);
}

/**
 * Generates a ready-to-share 1200x630 OpenGraph (OG) social card featuring the diagram.
 */
export async function createOgCard(
  mermaidCodeOrSvg: string,
  options: OgCardOptions = {},
): Promise<Buffer> {
  const ResvgClass = await loadResvg();
  const width = options.width ?? 1200;
  const height = options.height ?? 630;
  const padding = options.padding ?? 60;
  const theme = options.theme ?? 'github';
  const darkMode = options.darkMode ?? true;
  const vars = getThemeVariables(theme, darkMode);
  const bgColor = options.background ?? vars.bg;

  // Resolve SVG
  let rawSvg = '';
  if (
    mermaidCodeOrSvg.trim().startsWith('<svg') &&
    mermaidCodeOrSvg.includes('</svg>')
  ) {
    rawSvg = mermaidCodeOrSvg;
  } else {
    const res = renderSvg(mermaidCodeOrSvg);
    if (res.error) {
      throw new Error(`Failed to compile Mermaid diagram: ${res.error}`);
    }
    rawSvg = res.svg;
  }

  const themedSvg = resolveSvgTheme(rawSvg, theme, darkMode);

  // Extract viewBox / dimensions from themedSvg
  const vbMatch = themedSvg.match(/viewBox="([^"]+)"/i);
  let vbWidth = 800;
  let vbHeight = 400;
  if (vbMatch) {
    const parts = vbMatch[1].trim().split(/\s+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      vbWidth = parts[2];
      vbHeight = parts[3];
    }
  }

  // Calculate layout bounds for diagram inside card
  const titleY = 90;
  const headerHeight = options.title ? 100 : 0;
  const footerHeight = options.subtitle ? 70 : 0;
  const availableWidth = width - padding * 2;
  const availableHeight = height - padding * 2 - headerHeight - footerHeight;

  // Scale diagram to fit available box preserving aspect ratio
  const scale = Math.min(
    availableWidth / vbWidth,
    availableHeight / vbHeight,
    1.8,
  );
  const scaledW = vbWidth * scale;
  const scaledH = vbHeight * scale;
  const diagX = Math.round(padding + (availableWidth - scaledW) / 2);
  const diagY = Math.round(
    padding + headerHeight + (availableHeight - scaledH) / 2,
  );

  let titleElement = '';
  if (options.title) {
    titleElement = `<text x="${padding}" y="${titleY}" font-family="${vars.font || 'sans-serif'}" font-size="34" font-weight="700" fill="${vars.fg}">${escapeHtml(options.title)}</text>`;
  }

  let subtitleElement = '';
  if (options.subtitle) {
    subtitleElement = `<text x="${padding}" y="${height - padding + 15}" font-family="${vars.font || 'sans-serif'}" font-size="20" fill="${vars.muted}">${escapeHtml(options.subtitle)}</text>`;
  }

  // Strip XML prolog or root svg wrapper tag from themedSvg to embed inside card <svg>
  const innerSvgContent = themedSvg
    .replace(/<svg\b[^>]*>/i, '')
    .replace(/<\/svg>\s*$/i, '');

  const cardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bgColor}"/>
  ${titleElement}
  <g transform="translate(${diagX}, ${diagY}) scale(${scale})">
    ${innerSvgContent}
  </g>
  ${subtitleElement}
</svg>`;

  const resvg = new ResvgClass(cardSvg, {
    fitTo: { mode: 'width', value: width },
  });
  return resvg.render().asPng();
}
