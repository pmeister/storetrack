import { useState } from 'react'
import {
  needsRestock,
  useAddPantryItem,
  useAddPantryItemToList,
  useDeletePantryItem,
  usePantry,
  useUpdatePantryItem,
} from '../hooks/usePantry'
import { useStores } from '../hooks/useStores'
import { useSections } from '../hooks/useSections'
import type { PantryItem } from '../lib/types'
import QuantityStepper from '../components/QuantityStepper'

export default function PantryScreen() {
  const pantry = usePantry()
  const stores = useStores()
  const addItem = useAddPantryItem()
  const updateItem = useUpdatePantryItem()
  const deleteItem = useDeletePantryItem()
  const addToList = useAddPantryItemToList()
  const [name, setName] = useState('')
  const [restockOnly, setRestockOnly] = useState(false)
  const [pickerItem, setPickerItem] = useState<PantryItem | null>(null)

  const items = (pantry.data ?? []).filter((i) => !restockOnly || needsRestock(i))
  const needed = (pantry.data ?? []).filter(needsRestock)

  function sendToList(item: PantryItem) {
    if (item.default_store_id) {
      addToList.mutate({
        item,
        storeId: item.default_store_id,
        sectionId: item.default_section_id,
      })
    } else {
      setPickerItem(item)
    }
  }

  return (
    <div className="px-4 pb-24 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Pantry</h1>
        <button
          type="button"
          onClick={() => setRestockOnly(!restockOnly)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            restockOnly ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          Needs restock{needed.length > 0 && ` (${needed.length})`}
        </button>
      </div>

      {needed.length > 1 && (
        <button
          type="button"
          onClick={() => needed.forEach(sendToList)}
          className="mt-3 w-full rounded-xl border border-emerald-600 py-2 text-sm font-semibold text-emerald-700 active:bg-emerald-50"
        >
          Add all needed to shopping lists
        </button>
      )}

      {pantry.isPending && <p className="mt-6 text-sm text-slate-400">Loading…</p>}
      {pantry.data?.length === 0 && (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Track what you have at home — when something runs low, push it onto a
          store's shopping list.
        </p>
      )}

      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const low = needsRestock(item)
          return (
            <li
              key={item.id}
              className={`rounded-2xl border bg-white px-4 py-3 ${
                low ? 'border-amber-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
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
                <QuantityStepper
                  value={item.quantity}
                  onChange={(quantity) => updateItem.mutate({ id: item.id, quantity })}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => {
                    const next = prompt('Restock when below', String(item.restock_threshold))
                    const parsed = next ? parseInt(next, 10) : NaN
                    if (!Number.isNaN(parsed) && parsed >= 0) {
                      updateItem.mutate({ id: item.id, restock_threshold: parsed })
                    }
                  }}
                >
                  restock below {item.restock_threshold}
                </button>
                <div className="flex items-center gap-3">
                  {low && (
                    <button
                      type="button"
                      onClick={() => sendToList(item)}
                      className="font-semibold text-emerald-600"
                    >
                      + Add to list
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove ${item.name} from pantry?`)) deleteItem.mutate(item.id)
                    }}
                    className="text-slate-300 active:text-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
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
          addItem.mutate({ name: trimmed })
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

      {pickerItem && (
        <StorePicker
          item={pickerItem}
          storeIds={stores.data?.map((s) => ({ id: s.id, name: s.name })) ?? []}
          onPick={(storeId, sectionId) => {
            addToList.mutate({ item: pickerItem, storeId, sectionId })
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
