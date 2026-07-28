import { useRef, useState } from 'react'
import {
  useAddPantryItem,
  useAddPantryItemToList,
  useDeletePantryItem,
  usePantry,
  useUpdatePantryItem,
} from '../hooks/usePantry'
import { useStores } from '../hooks/useStores'
import { useSections } from '../hooks/useSections'
import type { PantryItem } from '../lib/types'

export default function PantryScreen() {
  const pantry = usePantry()
  const stores = useStores()
  const addItem = useAddPantryItem()
  const updateItem = useUpdatePantryItem()
  const deleteItem = useDeletePantryItem()
  const addToList = useAddPantryItemToList()
  const [name, setName] = useState('')
  const [pickerItem, setPickerItem] = useState<PantryItem | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  function showNotice(message: string) {
    setNotice(message)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), 2500)
  }

  function addWithFeedback(item: PantryItem, storeId: string, sectionId: string | null) {
    addToList.mutate(
      { item, storeId, sectionId },
      {
        onSuccess: ({ status, storeId: resultStoreId }) => {
          const storeName =
            stores.data?.find((s) => s.id === resultStoreId)?.name ?? 'the list'
          if (status === 'already-listed') {
            showNotice(`${item.name} is already on the ${storeName} list`)
          } else if (status === 'restored') {
            showNotice(`${item.name} moved from cart back onto the ${storeName} list`)
          } else {
            showNotice(`${item.name} added to the ${storeName} list`)
          }
        },
        onError: (error) => showNotice(`Couldn't add ${item.name}: ${error.message}`),
      },
    )
  }

  function sendToList(item: PantryItem) {
    if (item.default_store_id) {
      addWithFeedback(item, item.default_store_id, item.default_section_id)
    } else {
      setPickerItem(item)
    }
  }

  return (
    <div className="px-4 pb-24 pt-6">
      <h1 className="text-2xl font-bold">Pantry</h1>
      <p className="mt-1 text-sm text-slate-500">
        Staples you buy again and again — one tap puts them on the right list.
      </p>

      {pantry.isPending && <p className="mt-6 text-sm text-slate-400">Loading…</p>}
      {pantry.data?.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Keep a list of things you regularly buy, and push them onto a store's
          shopping list when you need them.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {pantry.data?.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left font-medium"
              onClick={() => {
                const next = prompt('Rename item', item.name)
                if (next?.trim() && next.trim() !== item.name) {
                  updateItem.mutate({ id: item.id, name: next.trim() })
                }
              }}
            >
              {item.name}
            </button>
            <button
              type="button"
              onClick={() => sendToList(item)}
              className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 active:bg-emerald-100"
            >
              + Add to list
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remove ${item.name} from pantry?`)) deleteItem.mutate(item.id)
              }}
              className="shrink-0 p-1 text-xs font-semibold text-red-400 active:text-red-600"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) return
          addItem.mutate(trimmed)
          setName('')
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New pantry item…"
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

      {notice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4">
          <p className="rounded-full bg-slate-900/90 px-4 py-2 text-sm text-white shadow-lg">
            {notice}
          </p>
        </div>
      )}

      {pickerItem && (
        <StorePicker
          item={pickerItem}
          storeIds={stores.data?.map((s) => ({ id: s.id, name: s.name })) ?? []}
          onPick={(storeId, sectionId) => {
            addWithFeedback(pickerItem, storeId, sectionId)
            setPickerItem(null)
          }}
          onClose={() => setPickerItem(null)}
        />
      )}
    </div>
  )
}

function StorePicker({
  item,
  storeIds,
  onPick,
  onClose,
}: {
  item: PantryItem
  storeIds: { id: string; name: string }[]
  onPick: (storeId: string, sectionId: string | null) => void
  onClose: () => void
}) {
  const [storeId, setStoreId] = useState<string | null>(null)
  const sections = useSections(storeId ?? '')

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-semibold">
          {storeId ? `Which section?` : `Which store for ${item.name}?`}
        </h2>
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {!storeId
            ? storeIds.map((store) => (
                <li key={store.id}>
                  <button
                    type="button"
                    onClick={() => setStoreId(store.id)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left font-medium active:bg-slate-50"
                  >
                    {store.name}
                  </button>
                </li>
              ))
            : [
                <li key="unsorted">
                  <button
                    type="button"
                    onClick={() => onPick(storeId, null)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left font-medium active:bg-slate-50"
                  >
                    Unsorted
                  </button>
                </li>,
                ...(sections.data ?? []).map((section) => (
                  <li key={section.id}>
                    <button
                      type="button"
                      onClick={() => onPick(storeId, section.id)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left font-medium active:bg-slate-50"
                    >
                      {section.name}
                    </button>
                  </li>
                )),
              ]}
        </ul>
        {storeIds.length === 0 && (
          <p className="mt-2 text-sm text-slate-500">Add a store first on the Stores tab.</p>
        )}
      </div>
    </div>
  )
}
