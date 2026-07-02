'use client'

const LABELS: Record<number, string> = {
  0: 'לא רלוונטי',
  1: 'מתחת לציפיות',
  2: 'נדרש שיפור',
  3: 'עומד בציפיות',
  4: 'מעל הציפיות',
}

const COLORS: Record<number, string> = {
  0: 'border-gray-300 bg-gray-50 text-gray-500',
  1: 'border-red-400 bg-red-50 text-red-700',
  2: 'border-orange-400 bg-orange-50 text-orange-700',
  3: 'border-blue-400 bg-blue-50 text-blue-700',
  4: 'border-green-500 bg-green-50 text-green-700',
}

export function ScoreSelector({
  value,
  onChange,
  readonly = false,
}: {
  value: number | undefined
  onChange?: (v: number) => void
  readonly?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {[0, 1, 2, 3, 4].map(score => (
        <button
          key={score}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(score)}
          title={LABELS[score]}
          className={`w-10 h-10 rounded-xl border-2 font-bold text-sm transition-all ${
            value === score
              ? COLORS[score] + ' scale-110 shadow-sm'
              : 'border-gray-200 bg-white text-gray-400 hover:border-gray-400'
          } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          {score === 0 ? 'N/A' : score}
        </button>
      ))}
      {value !== undefined && (
        <span className="self-center text-xs text-gray-500 mr-2">{LABELS[value] || ''}</span>
      )}
    </div>
  )
}
