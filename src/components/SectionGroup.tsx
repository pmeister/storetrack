import type { ListItem } from '../lib/types'
import ChecklistItem from './ChecklistItem'

interface Props {
  title: string
  items: ListItem[]
  onToggle: (item: ListItem) => void
  onActions: (item: ListItem) => void
  onHeaderClick: () => void
}

export default function SectionGroup({ title, items, onToggle, onActions, onHeaderClick }: Props) {
  if (items.length === 0) return null
  return (
    <section className="mt-3">
      <h2 className="border-y border-emerald-100 bg-emerald-50">
        <button
          type="button"
          onClick={onHeaderClick}
          className="w-full px-4 py-2 text-left text-base font-bold text-emerald-900 active:bg-emerald-100"
        >
          {title}
        </button>
      </h2>
      <ul className="divide-y divide-slate-100 border-b border-slate-100">
        {items.map((item) => (
          <ChecklistItem key={item.id} item={item} onToggle={onToggle} onActions={onActions} />
        ))}
      </ul>
    </section>
  )
}
