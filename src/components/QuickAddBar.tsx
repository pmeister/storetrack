import { useState } from 'react'
import type { Section } from '../lib/types'

interface Props {
  sections: Section[]
  /** Unique item names across all stores, for autocomplete. */
  suggestions: string[]
  onAdd: (name: string, sectionId: string | null) => void
}

const MIN_CHARS = 2
const MAX_SUGGESTIONS = 6

/**
 * Case-insensitive matches anchored at a word boundary: "milk" matches
 * "Silk Almond Milk", but "berry" does not match "strawberry".
 */
function boundaryMatches(suggestions: string[], input: string): string[] {
  const trimmed = input.trim()
  if (trimmed.length < MIN_CHARS) return []
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${escaped}`, 'i')
  return suggestions.filter((name) => re.test(name)).slice(0, MAX_SUGGESTIONS)
}

/** Sticky bar above the tab bar: item name + section chip picker. */
export default function QuickAddBar({ sections, suggestions, onAdd }: Props) {
  const [name, setName] = useState('')
  const [sectionId, setSectionId] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)

  const matches = focused ? boundaryMatches(suggestions, name) : []

  function submit(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    onAdd(trimmed, sectionId)
    setName('')
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="relative mx-auto max-w-lg px-3 py-2">
        {matches.length > 0 && (
          <ul className="absolute inset-x-3 bottom-full mb-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {matches.map((match) => (
              <li key={match}>
                <button
                  type="button"
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => submit(match)}
                  className="w-full border-b border-slate-100 px-4 py-2.5 text-left text-base last:border-b-0 active:bg-emerald-50"
                >
                  {match}
                </button>
              </li>
            ))}
          </ul>
        )}
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
            submit(name)
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
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
