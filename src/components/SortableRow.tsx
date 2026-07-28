import type { ReactNode } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Props {
  id: string
  children: ReactNode
}

/** dnd-kit sortable list row with a touch-friendly drag handle. */
export default function SortableRow({ id, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 bg-white px-4 py-2 ${isDragging ? 'z-10 shadow-lg' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="touch-none p-2 text-slate-500"
        aria-label="Drag to reorder"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5">
          <path strokeLinecap="round" d="M4 9h16M4 15h16" />
        </svg>
      </button>
      {children}
    </li>
  )
}
