interface Props {
  value: number
  onChange: (next: number) => void
  min?: number
}

export default function QuantityStepper({ value, onChange, min = 0 }: Props) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-600 active:bg-slate-200 disabled:opacity-30"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-600 active:bg-slate-200"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}
