import { generateKeyBetween } from 'fractional-indexing'

/** Position key that sorts after every row in `rows` (rows must be sorted by position). */
export function keyAfterLast(rows: { position: string }[]): string {
  const last = rows.length > 0 ? rows[rows.length - 1].position : null
  return generateKeyBetween(last, null)
}

/**
 * Position key for moving a row to index `toIndex` within `sorted`
 * (the array without the moving row).
 */
export function keyAtIndex(sorted: { position: string }[], toIndex: number): string {
  const before = toIndex > 0 ? sorted[toIndex - 1].position : null
  const after = toIndex < sorted.length ? sorted[toIndex].position : null
  return generateKeyBetween(before, after)
}
