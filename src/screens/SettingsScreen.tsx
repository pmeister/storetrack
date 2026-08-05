import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth, useHouseholdId } from '../hooks/useAuth'
import { useMembers, useUpdateNickname } from '../hooks/useMembers'
import { effectiveNickname } from '../lib/nicknames'
import { FONT_SIZES, applyFontSize, readFontSize } from '../lib/fontSize'
import type { Household } from '../lib/types'

export default function SettingsScreen() {
  const { profile } = useAuth()
  const householdId = useHouseholdId()
  const members = useMembers()
  const updateNickname = useUpdateNickname()
  const [copied, setCopied] = useState(false)
  const [nickname, setNickname] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [fontSize, setFontSize] = useState(readFontSize)

  const household = useQuery({
    queryKey: ['household', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('households')
        .select('*')
        .eq('id', householdId)
        .single()
      if (error) throw error
      return data as Household
    },
  })

  const me = members.data?.find((m) => m.id === profile?.id) ?? profile
  const shownNickname = nickname ?? (me ? effectiveNickname(me) : '')

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Household
        </h2>
        <p className="mt-1 text-lg font-semibold">{household.data?.name ?? '…'}</p>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
          <div>
            <p className="text-xs text-slate-400">Invite code</p>
            <p className="text-xl font-bold tracking-[0.3em]">
              {household.data?.invite_code ?? '······'}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!household.data) return
              await navigator.clipboard.writeText(household.data.invite_code)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Family members enter this code when they sign up to share your lists.
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Your nickname
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Shown next to your changes in the Activity log. Defaults to your initials.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            updateNickname.mutate(shownNickname, {
              onSuccess: () => {
                setSaved(true)
                setTimeout(() => setSaved(false), 1500)
              },
            })
          }}
        >
          <input
            value={shownNickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={12}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-base outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            disabled={updateNickname.isPending || !shownNickname.trim()}
            className="rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-40"
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Members
        </h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {members.data?.map((member) => (
            <li key={member.id} className="flex items-center gap-2 py-2">
              <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-emerald-100 px-1.5 text-xs font-bold text-emerald-700">
                {effectiveNickname(member)}
              </span>
              <span className="font-medium">{member.display_name || 'Unnamed'}</span>
              {member.id === profile?.id && (
                <span className="text-xs text-slate-400">(you)</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Text size
        </h2>
        <p className="mt-1 text-xs text-slate-400">Applies to all text in the app.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-pressed={fontSize === size}
              onClick={() => {
                applyFontSize(size)
                setFontSize(size)
              }}
              className={`rounded-xl border py-2.5 text-sm font-semibold capitalize ${
                fontSize === size
                  ? 'border-emerald-600 bg-emerald-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 active:bg-slate-50'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="mt-6 w-full rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-600 active:bg-slate-50"
      >
        Sign out
      </button>

      <p className="mt-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Patrick Taylor,{' '}
        <a
          href="https://github.com/pmeister"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-emerald-600 underline"
        >
          @pmeister
        </a>
      </p>
    </div>
  )
}
