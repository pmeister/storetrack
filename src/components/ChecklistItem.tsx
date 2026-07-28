import type { ListItem } from '../lib/types'

interface Props {
  item: ListItem
  onToggle: (item: ListItem) => void
  onDelete: (item: ListItem) => void
  onRename: (item: ListItem) => void
  onMove?: (item: ListItem) => void
}

export default function ChecklistItem({ item, onToggle, onDelete, onRename, onMove }: Props) {
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
        </span>
      </button>
      {onMove && (
        <button
          type="button"
          onClick={() => onMove(item)}
          className="p-2 text-slate-300 active:text-emerald-600"
          aria-label={`Move ${item.name} to another section`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
            />
          </svg>
        </button>
      )}
      <button
        type="button"
        onClick={() => onRename(item)}
        className="p-2 text-slate-300 active:text-emerald-600"
        aria-label={`Rename ${item.name}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m16.86 4.49 1.65-1.65a1.88 1.88 0 1 1 2.65 2.65L7.83 18.82a4.5 4.5 0 0 1-1.9 1.13L3 20.75l.8-2.93a4.5 4.5 0 0 1 1.13-1.9L16.86 4.49Zm0 0 2.65 2.65"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onDelete(item)}
        className="p-2 text-slate-300 active:text-red-500"
        aria-label={`Delete ${item.name}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  )
}
