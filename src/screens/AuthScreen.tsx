import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName.trim() || email.split('@')[0] } },
        })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="text-center text-3xl font-bold text-emerald-600">StoreTrack</h1>
      <p className="mt-1 text-center text-sm text-slate-500">
        Shopping lists organized by store
      </p>

      <form onSubmit={submit} className="mt-8 space-y-3">
        {mode === 'signup' && (
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white active:bg-emerald-700 disabled:opacity-50"
        >
          {mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
        className="mt-4 text-sm text-emerald-600"
      >
        {mode === 'signup'
          ? 'Already have an account? Sign in'
          : "New here? Create an account"}
      </button>
    </div>
  )
}
