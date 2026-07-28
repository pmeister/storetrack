import type { ListItem } from '../lib/types'
import ChecklistItem from './ChecklistItem'

interface Props {
  title: string
  items: ListItem[]
  onToggle: (item: ListItem) => void
  onActions: (item: ListItem) => void
}

export default function SectionGroup({ title, items, onToggle, onActions }: Props) {
  if (items.length === 0) return null
  return (
    <section className="mt-3">
      <h2 className="border-y border-emerald-100 bg-emerald-50 px-4 py-2 text-base font-bold text-emerald-900">
        {title}
      </h2>
      <ul className="divide-y divide-slate-100 border-b border-slate-100">
        {items.map((item) => (
          <ChecklistItem key={item.id} item={item} onToggle={onToggle} onActions={onActions} />
        ))}
      </ul>
    </section>
  )
}
