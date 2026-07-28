import type { ListItem } from '../lib/types'

interface Props {
  item: ListItem
  onToggle: (item: ListItem) => void
  onActions: (item: ListItem) => void
}

export default function ChecklistItem({ item, onToggle, onActions }: Props) {
  return (
    <li className="flex items-center gap-3 bg-white px-4 py-1">
      <button
        type="button"
        onClick={() => onToggle(item)}
        className="flex min-h-11 flex-1 items-center gap-3 text-left"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            item.checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300'
          }`}
        >
          {item.checked && (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
            </svg>
          )}
        </span>
        <span className={item.checked ? 'text-slate-400 line-through' : ''}>
          {item.name}
          {item.quantity > 1 && (
            <span className="ml-2 text-sm font-medium text-slate-400">×{item.quantity}</span>
          )}
          {item.pantry_item_id && (
            <span className="ml-2 align-middle text-xs text-emerald-500" title="Tracked in pantry">
              ◆
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onActions(item)}
        className="p-2 text-slate-500 active:text-slate-700"
        aria-label={`Actions for ${item.name}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
    </li>
  )
}
