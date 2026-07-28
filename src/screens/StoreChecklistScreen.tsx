import { Link, useNavigate, useParams } from 'react-router'
import { useState } from 'react'
import { useStores, useDeleteStore, useRenameStore } from '../hooks/useStores'
import { useSections } from '../hooks/useSections'
import {
  buildListItem,
  useAddListItem,
  useDeleteListItem,
  useListItems,
  useMoveListItem,
  useRenameListItem,
  useToggleListItem,
  useUncheckAll,
} from '../hooks/useListItems'
import { useTrackInPantry } from '../hooks/usePantry'
import { useHouseholdId } from '../hooks/useAuth'
import type { ListItem } from '../lib/types'
import SectionGroup from '../components/SectionGroup'
import ChecklistItem from '../components/ChecklistItem'
import QuickAddBar from '../components/QuickAddBar'

export default function StoreChecklistScreen() {
  const { storeId } = useParams<{ storeId: string }>()
  const householdId = useHouseholdId()
  const navigate = useNavigate()
  const stores = useStores()
  const sections = useSections(storeId!)
  const items = useListItems(storeId!)
  const addItem = useAddListItem(storeId!)
  const toggleItem = useToggleListItem(storeId!)
  const deleteItem = useDeleteListItem(storeId!)
  const renameItem = useRenameListItem(storeId!)
  const moveItem = useMoveListItem(storeId!)
  const uncheckAll = useUncheckAll(storeId!)
  const trackInPantry = useTrackInPantry()
  const deleteStore = useDeleteStore()
  const renameStore = useRenameStore()
  const [actionItem, setActionItem] = useState<ListItem | null>(null)
  const [movingItem, setMovingItem] = useState<ListItem | null>(null)

  const store = stores.data?.find((s) => s.id === storeId)
  const unchecked = (items.data ?? []).filter((i) => !i.checked)
  const checked = (items.data ?? []).filter((i) => i.checked)
  const bySection = new Map<string | null, ListItem[]>()
  for (const item of unchecked) {
    const list = bySection.get(item.section_id) ?? []
    list.push(item)
    bySection.set(item.section_id, list)
  }

  const onToggle = (item: ListItem) => toggleItem.mutate({ id: item.id, checked: !item.checked })

  return (
    <div className="pb-40 pt-4">
      <header className="flex items-center gap-2 px-4">
        <Link to="/" className="-ml-2 p-2 text-slate-400" aria-label="Back to stores">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <button
          type="button"
          className="min-w-0 flex-1 truncate text-left text-xl font-bold"
          onClick={() => {
            if (!store) return
            const next = prompt('Rename store', store.name)
            if (next?.trim() && next.trim() !== store.name) {
              renameStore.mutate({ id: store.id, name: next.trim() })
            }
          }}
        >
          {store?.name ?? 'Store'}
        </button>
        <Link
          to={`/stores/${storeId}/sections`}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
        >
          Sections
        </Link>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete ${store?.name ?? 'this store'} and its list?`)) {
              deleteStore.mutate(storeId!, { onSuccess: () => navigate('/') })
            }
          }}
          className="p-1.5 text-slate-300 active:text-red-500"
          aria-label="Delete store"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m14.74 9-.35 9m-4.79 0L9.26 9m9.97-3.21c.34.05.68.11 1.02.17m-1.02-.17-1.06 13.72a2.25 2.25 0 0 1-2.24 2.08H8.08a2.25 2.25 0 0 1-2.24-2.08L4.77 5.79m14.46 0a48.1 48.1 0 0 0-3.48-.4m-12 .56c.34-.06.68-.12 1.02-.17m1.98-.24a48.1 48.1 0 0 1 3.48-.4m6.5.64V4.48c0-1.1-.85-2.03-1.95-2.07a51.96 51.96 0 0 0-3.6 0c-1.1.04-1.95.97-1.95 2.07v1.11m7.5 0a48.7 48.7 0 0 0-7.5 0"
            />
          </svg>
        </button>
      </header>

      {items.isPending ? (
        <p className="mt-8 px-4 text-sm text-slate-400">Loading…</p>
      ) : unchecked.length === 0 && checked.length === 0 ? (
        <p className="mx-4 mt-8 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Nothing on the list. Add items below.
        </p>
      ) : (
        <div className="mt-2">
          {sections.data?.map((section) => (
            <SectionGroup
              key={section.id}
              title={section.name}
              items={bySection.get(section.id) ?? []}
              onToggle={onToggle}
              onActions={setActionItem}
            />
          ))}
          <SectionGroup
            title="Unsorted"
            items={bySection.get(null) ?? []}
            onToggle={onToggle}
            onActions={setActionItem}
          />

          {checked.length > 0 && (
            <section className="mt-6">
              <div className="flex items-center justify-between px-4 py-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  In cart ({checked.length})
                </span>
                <button
                  type="button"
                  onClick={() => uncheckAll.mutate()}
                  className="text-xs font-semibold text-emerald-600"
                >
                  Uncheck all
                </button>
              </div>
              <ul className="divide-y divide-slate-100 border-y border-slate-100">
                {checked.map((item) => (
                  <ChecklistItem
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onActions={setActionItem}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {actionItem && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
          onClick={() => setActionItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="truncate font-semibold">{actionItem.name}</h2>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => {
                  const next = prompt('Rename item', actionItem.name)
                  if (next?.trim() && next.trim() !== actionItem.name) {
                    renameItem.mutate({ id: actionItem.id, name: next.trim() })
                  }
                  setActionItem(null)
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left font-medium active:bg-slate-50"
              >
                Rename
              </button>
              <button
                type="button"
                onClick={() => {
                  setMovingItem(actionItem)
                  setActionItem(null)
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left font-medium active:bg-slate-50"
              >
                Move to section…
              </button>
              <button
                type="button"
                disabled={!!actionItem.pantry_item_id}
                onClick={() => {
                  trackInPantry.mutate(actionItem)
                  setActionItem(null)
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left font-medium active:bg-slate-50 disabled:text-slate-300"
              >
                {actionItem.pantry_item_id ? 'Already in pantry ◆' : 'Add to pantry'}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteItem.mutate(actionItem.id)
                  setActionItem(null)
                }}
                className="w-full rounded-xl border border-red-200 px-4 py-3 text-left font-medium text-red-600 active:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {movingItem && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
          onClick={() => setMovingItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-semibold">Move “{movingItem.name}” to…</h2>
            <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {[
                { id: null as string | null, name: 'Unsorted' },
                ...(sections.data ?? []),
              ]
                .filter((section) => section.id !== movingItem.section_id)
                .map((section) => (
                  <li key={section.id ?? 'unsorted'}>
                    <button
                      type="button"
                      onClick={() => {
                        moveItem.mutate({ id: movingItem.id, sectionId: section.id })
                        setMovingItem(null)
                      }}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left font-medium active:bg-slate-50"
                    >
                      {section.name}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}

      <QuickAddBar
        sections={sections.data ?? []}
        onAdd={(name, sectionId) =>
          addItem.mutate(buildListItem(householdId, storeId!, items.data ?? [], { name, sectionId }))
        }
      />
    </div>
  )
}
