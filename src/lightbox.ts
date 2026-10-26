export interface LightboxOptions {
  /**
   * Whether to wrap diagrams with a zero-JS lightbox modal.
   * @default false
   */
  enabled?: boolean;

  /**
   * Modal strategy:
   * - 'popover': Native HTML5 Popover API with light-dismiss, Esc close, and top-layer management.
   * - 'target': Pure CSS :target hash navigation modal with backdrop link.
   * - 'auto': Dual mode supporting both Popover API and :target CSS fallback.
   * @default 'auto'
   */
  mode?: 'popover' | 'target' | 'auto';

  /**
   * Custom ID prefix for the lightbox modal element.
   * @default 'pele-lb'
   */
  idPrefix?: string;

  /**
   * Accessible label for the lightbox trigger button.
   * @default 'Open fullscreen diagram'
   */
  triggerLabel?: string;

  /**
   * Accessible label for the lightbox modal.
   * @default 'Fullscreen diagram'
   */
  dialogLabel?: string;

  /**
   * Accessible label for the close button.
   * @default 'Close fullscreen diagram'
   */
  closeLabel?: string;
}

const EXPAND_ICON_SVG =
  '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>';

function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Wraps SVG diagram in pure CSS / HTML5 zero-JS lightbox markup.
 * Supports HTML5 Popover API, CSS :target fallback, and keyboard light-dismiss.
 */
export function renderLightbox(
  svg: string,
  options: LightboxOptions = {},
  diagramCodeOrId?: string,
): { wrapperHtml: string; id: string } {
  const mode = options.mode ?? 'auto';
  const prefix = options.idPrefix ?? 'pele-lb';
  const id =
    diagramCodeOrId &&
    !diagramCodeOrId.includes('\n') &&
    !diagramCodeOrId.includes(' ')
      ? diagramCodeOrId
      : `${prefix}-${hashString(diagramCodeOrId || svg)}`;

  const triggerLabel = escapeHtml(
    options.triggerLabel ?? 'Open fullscreen diagram',
  );
  const dialogLabel = escapeHtml(options.dialogLabel ?? 'Fullscreen diagram');
  const closeLabel = escapeHtml(
    options.closeLabel ?? 'Close fullscreen diagram',
  );

  let triggerTag = '';
  let closeTag = '';
  let backdropTag = '';
  let popoverAttr = '';

  if (mode === 'popover') {
    popoverAttr = ' popover="auto"';
    triggerTag = `<button type="button" class="pele-lightbox-trigger" popovertarget="${id}" aria-label="${triggerLabel}" title="${triggerLabel}"><span class="pele-lightbox-icon" aria-hidden="true">${EXPAND_ICON_SVG}</span></button>`;
    closeTag = `<button type="button" class="pele-lightbox-close" popovertarget="${id}" popovertargetaction="hide" aria-label="${closeLabel}" title="${closeLabel}"><span aria-hidden="true">&times;</span></button>`;
  } else if (mode === 'target') {
    triggerTag = `<a href="#${id}" class="pele-lightbox-trigger" aria-label="${triggerLabel}" title="${triggerLabel}"><span class="pele-lightbox-icon" aria-hidden="true">${EXPAND_ICON_SVG}</span></a>`;
    closeTag = `<a href="#_" class="pele-lightbox-close" aria-label="${closeLabel}" title="${closeLabel}"><span aria-hidden="true">&times;</span></a>`;
    backdropTag =
      '<a href="#_" class="pele-lightbox-backdrop" aria-hidden="true" tabindex="-1"></a>\n  ';
  } else {
    // auto / hybrid
    popoverAttr = ' popover="auto"';
    triggerTag = `<a href="#${id}" class="pele-lightbox-trigger" popovertarget="${id}" aria-label="${triggerLabel}" title="${triggerLabel}"><span class="pele-lightbox-icon" aria-hidden="true">${EXPAND_ICON_SVG}</span></a>`;
    closeTag = `<a href="#_" class="pele-lightbox-close" popovertarget="${id}" popovertargetaction="hide" aria-label="${closeLabel}" title="${closeLabel}"><span aria-hidden="true">&times;</span></a>`;
    backdropTag =
      '<a href="#_" class="pele-lightbox-backdrop" aria-hidden="true" tabindex="-1"></a>\n  ';
  }

  const wrapperHtml = `<div class="pele-svg-wrapper">
  ${svg}
  <div class="pele-lightbox-toolbar">
    ${triggerTag}
  </div>
</div>
<div id="${id}" class="pele-lightbox"${popoverAttr} role="dialog" aria-modal="true" aria-label="${dialogLabel}">
  ${backdropTag}<div class="pele-lightbox-dialog">
    <div class="pele-lightbox-header">
      <span class="pele-lightbox-title">${dialogLabel}</span>
      ${closeTag}
    </div>
    <div class="pele-lightbox-body">
      ${svg}
    </div>
  </div>
</div>`;

  return { wrapperHtml, id };
}
