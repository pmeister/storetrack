export const FONT_SIZES = ['small', 'medium', 'large'] as const

export type FontSize = (typeof FONT_SIZES)[number]

const STORAGE_KEY = 'storetrack-font-size'

export function readFontSize(): FontSize {
  const stored = localStorage.getItem(STORAGE_KEY)
  return FONT_SIZES.includes(stored as FontSize) ? (stored as FontSize) : 'small'
}

/** Scales every Tailwind text-* utility; see the [data-font-size] rules in index.css. */
export function applyFontSize(size: FontSize) {
  document.documentElement.dataset.fontSize = size
  localStorage.setItem(STORAGE_KEY, size)
}
