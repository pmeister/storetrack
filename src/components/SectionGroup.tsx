import type { ListItem } from '../lib/types'
import ChecklistItem from './ChecklistItem'

interface Props {
  title: string
  items: ListItem[]
  onToggle: (item: ListItem) => void
  onDelete: (item: ListItem) => void
  onRename: (item: ListItem) => void
}

export default function SectionGroup({ title, items, onToggle, onDelete, onRename }: Props) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h2>
      <ul className="divide-y divide-slate-100 border-y border-slate-100">
        {items.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            onToggle={onToggle}
            onDelete={onDelete}
            onRename={onRename}
          />
        ))}
      </ul>
    </section>
  )
}
