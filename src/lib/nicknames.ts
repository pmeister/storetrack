import type { Profile } from './types'

export function initialsOf(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

/** The nickname to show for a member: their chosen one, or their initials. */
export function effectiveNickname(profile: Pick<Profile, 'nickname' | 'display_name'>): string {
  return profile.nickname?.trim() || initialsOf(profile.display_name)
}
