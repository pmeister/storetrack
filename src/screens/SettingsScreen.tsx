import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth, useHouseholdId } from '../hooks/useAuth'
import type { Household, Profile } from '../lib/types'

export default function SettingsScreen() {
  const { profile } = useAuth()
  const householdId = useHouseholdId()
  const [copied, setCopied] = useState(false)

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

  const members = useQuery({
    queryKey: ['members', householdId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('household_id', householdId)
        .order('display_name')
      if (error) throw error
      return data as Profile[]
    },
  })

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
          Members
        </h2>
        <ul className="mt-2 divide-y divide-slate-100">
          {members.data?.map((member) => (
            <li key={member.id} className="flex items-center gap-2 py-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                {(member.display_name || '?')[0].toUpperCase()}
              </span>
              <span className="font-medium">{member.display_name || 'Unnamed'}</span>
              {member.id === profile?.id && (
                <span className="text-xs text-slate-400">(you)</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={() => supabase.auth.signOut()}
        className="mt-6 w-full rounded-xl border border-slate-200 bg-white py-3 font-semibold text-slate-600 active:bg-slate-50"
      >
        Sign out
      </button>
    </div>
  )
}
