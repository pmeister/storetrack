import { useAuditLog, type ChangeEvent } from '../hooks/useAuditLog'
import { useStores } from '../hooks/useStores'
import { useMembers } from '../hooks/useMembers'
import { effectiveNickname } from '../lib/nicknames'
import type { Profile, Store } from '../lib/types'

export default function ActivityScreen() {
  const log = useAuditLog()
  const stores = useStores()
  const members = useMembers()

  return (
    <div className="px-4 pb-24 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activity</h1>
        <button
          type="button"
          onClick={() => log.refetch()}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 active:bg-slate-200"
        >
          Refresh
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Every change from everyone in the household. Please be patient; this can
        take a moment to refresh.
      </p>

      {log.isPending && <p className="mt-6 text-sm text-slate-400">Reading the change stream…</p>}
      {log.isError && (
        <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn't load the audit log: {log.error.message}
        </p>
      )}
      {log.data?.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No recorded changes yet. Make a change in a list and refresh.
        </p>
      )}

      <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {log.data?.map((event, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <span className="mt-0.5 text-base">{iconFor(event)}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm">
                {actorChip(event, members.data ?? [])}
                {describe(event, stores.data ?? [])}
              </span>
              <span className="block text-xs text-slate-400">{formatTime(event.at)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function actorChip(event: ChangeEvent, members: Profile[]) {
  const actorId =
    (event.record?.updated_by as string | undefined) ??
    (event.old_record?.updated_by as string | undefined)
  const actor = members.find((m) => m.id === actorId)
  if (!actor) return null
  return (
    <span className="mr-1.5 inline-flex min-w-6 items-center justify-center rounded bg-emerald-100 px-1 align-text-bottom text-xs font-bold text-emerald-700">
      {effectiveNickname(actor)}
    </span>
  )
}

function iconFor(event: ChangeEvent): string {
  if (event.table === 'list_items' && event.op === 'UPDATE') {
    if (event.record?.checked && !event.old_record?.checked) return '✅'
    if (!event.record?.checked && event.old_record?.checked) return '↩️'
  }
  if (event.op === 'INSERT') return '➕'
  if (event.op === 'DELETE') return '🗑️'
  return '✏️'
}

function describe(event: ChangeEvent, stores: Store[]): string {
  const name = (row: Record<string, unknown> | null) => String(row?.name ?? 'something')
  const storeName = (row: Record<string, unknown> | null) => {
    const store = stores.find((s) => s.id === row?.store_id)
    return store ? ` (${store.name})` : ''
  }

  if (event.table === 'stores') {
    if (event.op === 'INSERT') return `Added store ${name(event.record)}`
    if (event.op === 'DELETE') return `Deleted store ${name(event.old_record)}`
    if (event.record?.name !== event.old_record?.name)
      return `Renamed store ${name(event.old_record)} to ${name(event.record)}`
    return `Updated store ${name(event.record)}`
  }

  if (event.table === 'sections') {
    if (event.op === 'INSERT') return `Added section ${name(event.record)}${storeName(event.record)}`
    if (event.op === 'DELETE') return `Deleted section ${name(event.old_record)}${storeName(event.old_record)}`
    if (event.record?.name !== event.old_record?.name)
      return `Renamed section ${name(event.old_record)} to ${name(event.record)}${storeName(event.record)}`
    if (event.record?.position !== event.old_record?.position)
      return `Reordered section ${name(event.record)}${storeName(event.record)}`
    return `Updated section ${name(event.record)}${storeName(event.record)}`
  }

  // list_items
  if (event.op === 'INSERT') return `Added ${name(event.record)}${storeName(event.record)}`
  if (event.op === 'DELETE') return `Deleted ${name(event.old_record)}${storeName(event.old_record)}`
  if (event.record?.checked && !event.old_record?.checked)
    return `Checked off ${name(event.record)}${storeName(event.record)}`
  if (!event.record?.checked && event.old_record?.checked)
    return `Unchecked ${name(event.record)}${storeName(event.record)}`
  if (event.record?.name !== event.old_record?.name)
    return `Renamed ${name(event.old_record)} to ${name(event.record)}${storeName(event.record)}`
  if (event.record?.section_id !== event.old_record?.section_id)
    return `Moved ${name(event.record)} to another section${storeName(event.record)}`
  return `Updated ${name(event.record)}${storeName(event.record)}`
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  const today = new Date()
  const sameDay = date.toDateString() === today.toDateString()
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return sameDay ? time : `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`
}
