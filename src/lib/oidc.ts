import type { Provider } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface OidcProvider {
  id: Provider
  label: string
}

/**
 * Identity providers offered on the sign-in screen. Adding another one means
 * enabling it in Supabase (Authentication → Providers), appending an entry
 * here, and giving it a brand mark in AuthScreen — the redirect handling
 * itself is provider-agnostic.
 */
export const OIDC_PROVIDERS: OidcProvider[] = [{ id: 'google', label: 'Continue with Google' }]

/**
 * Starts the OIDC redirect. Returns to the origin the user launched from, so
 * an installed PWA lands back on its own start URL.
 */
export async function signInWithProvider(provider: Provider) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error) throw error
}

/**
 * Reads an error handed back on the OAuth redirect, if any, and strips it
 * from the URL so a refresh doesn't resurface it. (supabase-js already
 * cleans up the success case.)
 */
export function oauthRedirectError(): string | null {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const description = search.get('error_description') ?? hash.get('error_description')
  const code = search.get('error') ?? hash.get('error')
  if (!description && !code) return null
  window.history.replaceState({}, '', window.location.pathname)
  return description ?? code
}
