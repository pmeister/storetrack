import { useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  useAddSection,
  useDeleteSection,
  useMoveSection,
  useRenameSection,
  useSections,
} from '../hooks/useSections'
import { useStores } from '../hooks/useStores'
import SortableRow from '../components/SortableRow'

export default function SectionsScreen() {
  const { storeId } = useParams<{ storeId: string }>()
  const stores = useStores()
  const sections = useSections(storeId!)
  const addSection = useAddSection(storeId!)
  const renameSection = useRenameSection(storeId!)
  const deleteSection = useDeleteSection(storeId!)
  const moveSection = useMoveSection(storeId!)
  const [name, setName] = useState('')

  const store = stores.data?.find((s) => s.id === storeId)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !sections.data) return
    const oldIndex = sections.data.findIndex((s) => s.id === active.id)
    const newIndex = sections.data.findIndex((s) => s.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    moveSection.mutate({
      movedId: String(active.id),
      newOrder: arrayMove(sections.data, oldIndex, newIndex),
    })
  }

  return (
    <div className="pb-24 pt-4">
      <header className="flex items-center gap-2 px-4">
        <Link to={`/stores/${storeId}`} className="-ml-2 p-2 text-slate-400" aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="truncate text-xl font-bold">{store?.name} sections</h1>
      </header>
      <p className="mt-1 px-4 text-sm text-slate-500">
        Drag to match the order you walk the store.
      </p>

      {sections.data?.length === 0 && (
        <p className="mx-4 mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No sections yet. Try “Produce”, “Bakery”, or “Aisle 2”.
        </p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={sections.data?.map((s) => s.id) ?? []}
          strategy={verticalListSortingStrategy}
        >
          <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
            {sections.data?.map((section) => (
              <SortableRow key={section.id} id={section.id}>
                <button
                  type="button"
                  className="flex-1 py-1 text-left"
                  onClick={() => {
                    const next = prompt('Rename section', section.name)
                    if (next?.trim() && next.trim() !== section.name) {
                      renameSection.mutate({ id: section.id, name: next.trim() })
                    }
                  }}
                >
                  {section.name}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete “${section.name}”? Its items move to Unsorted.`)) {
                      deleteSection.mutate(section.id)
                    }
                  }}
                  className="p-2 text-slate-500 active:text-red-500"
                  aria-label={`Delete ${section.name}`}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </SortableRow>
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <form
        className="mt-6 flex gap-2 px-4"
        onSubmit={(e) => {
          e.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) return
          addSection.mutate(trimmed)
          setName('')
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New section name…"
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
