import { useState } from 'react'
import { Link } from 'react-router'
import { useAddStore, useStores, useUncheckedCounts } from '../hooks/useStores'

export default function StoresScreen() {
  const stores = useStores()
  const counts = useUncheckedCounts()
  const addStore = useAddStore()
  const [name, setName] = useState('')

  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold">Stores</h1>

      {stores.isPending && <p className="mt-6 text-sm text-slate-400">Loading…</p>}

      {stores.data?.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Add your first store below — then set up its sections to match how you
          walk through it.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {stores.data?.map((store) => {
          const count = counts.data?.[store.id] ?? 0
          return (
            <li key={store.id}>
              <Link
                to={`/stores/${store.id}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 active:bg-slate-50"
              >
                <span className="font-semibold">{store.name}</span>
                {count > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-sm font-semibold text-emerald-700">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) return
          addStore.mutate(trimmed)
          setName('')
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New store name…"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-base outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-xl bg-emerald-600 px-4 font-semibold text-white active:bg-emerald-700 disabled:opacity-40"
        >
          Add
        </button>
      </form>
    </div>
  )
}
