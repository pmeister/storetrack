import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

export { generateKeyBetween, generateNKeysBetween }

/**
 * ASCII compare for fractional-index keys. Always sort client-side with
 * this: Postgres' default collation orders mixed-case keys differently
 * than the byte order the keys require.
 */
export function byPosition(a: { position: string }, b: { position: string }): number {
  return a.position < b.position ? -1 : a.position > b.position ? 1 : 0
}

/** Position key that sorts after every row in `rows` (any order). */
export function keyAfterLast(rows: { position: string }[]): string {
  let last: string | null = null
  for (const row of rows) {
    if (last === null || row.position > last) last = row.position
  }
  return generateKeyBetween(last, null)
}
