import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export default function OnboardingScreen() {
  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const queryClient = useQueryClient()

  async function run(rpc: () => PromiseLike<{ error: { message: string } | null }>) {
    setError(null)
    setBusy(true)
    try {
      const { error } = await rpc()
      if (error) throw new Error(error.message)
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-2xl font-bold">Set up your household</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lists and pantry are shared with everyone in your household.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (householdName.trim())
            run(() => supabase.rpc('create_household', { p_name: householdName.trim() }))
        }}
        className="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <h2 className="font-semibold">Start a new household</h2>
        <div className="mt-3 flex gap-2">
          <input
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            placeholder="e.g. The Meisters"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-base outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={busy || !householdName.trim()}
            className="rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-40"
          >
            Create
          </button>
        </div>
      </form>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (inviteCode.trim())
            run(() => supabase.rpc('join_household', { p_code: inviteCode.trim() }))
        }}
        className="rounded-2xl border border-slate-200 bg-white p-4"
      >
        <h2 className="font-semibold">Join an existing one</h2>
        <p className="mt-1 text-xs text-slate-500">
          Ask a member for the invite code on their Settings screen.
        </p>
        <div className="mt-3 flex gap-2">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-base uppercase tracking-widest outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={busy || !inviteCode.trim()}
            className="rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-40"
          >
            Join
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="text-sm text-slate-400"
      >
        Sign out
      </button>
    </div>
  )
}
