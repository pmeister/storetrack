import { useState } from 'react'
import type { Section } from '../lib/types'

interface Props {
  sections: Section[]
  onAdd: (name: string, sectionId: string | null) => void
}

/** Sticky bar above the tab bar: item name + section chip picker. */
export default function QuickAddBar({ sections, onAdd }: Props) {
  const [name, setName] = useState('')
  const [sectionId, setSectionId] = useState<string | null>(null)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed, sectionId)
    setName('')
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-lg px-3 py-2">
        {sections.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
            <button
              type="button"
              onClick={() => setSectionId(null)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                sectionId === null
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              Unsorted
            </button>
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setSectionId(section.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  sectionId === section.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Add an item…"
            enterKeyHint="done"
            autoCapitalize="none"
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
    </div>
  )
}
