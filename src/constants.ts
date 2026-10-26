import type { AsciiOptions, BoxChars } from './types';

export const UNICODE_CHARS: BoxChars = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  junction: '┼',
  arrowRight: '►',
  arrowLeft: '◄',
  arrowUp: '▲',
  arrowDown: '▼',
  dottedHorizontal: '┈',
  dottedVertical: '┊',
};

export const ASCII_CHARS: BoxChars = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|',
  junction: '+',
  arrowRight: '>',
  arrowLeft: '<',
  arrowUp: '^',
  arrowDown: 'v',
  dottedHorizontal: '.',
  dottedVertical: ':',
};

export const DEFAULT_OPTIONS: Required<AsciiOptions> = {
  paddingX: 5,
  paddingY: 5,
  borderPadding: 1,
  asciiOnly: false,
  showCoords: false,
};

export function getBoxChars(options: AsciiOptions): BoxChars {
  return options.asciiOnly ? ASCII_CHARS : UNICODE_CHARS;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}
