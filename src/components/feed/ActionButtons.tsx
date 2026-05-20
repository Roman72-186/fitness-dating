'use client'

interface Props {
  onLike: () => void
  onSkip: () => void
  disabled?: boolean
  className?: string
}

export function ActionButtons({ onLike, onSkip, disabled, className = 'shrink-0 px-4 pb-4 pt-3' }: Props) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] border border-white/10 bg-brand-bg-2/80 p-2 shadow-panel backdrop-blur-sm">
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="flex min-h-[3.75rem] items-center justify-center rounded-[1.25rem] border border-brand-skip/35 bg-[color:color-mix(in_oklab,var(--color-brand-skip)_12%,var(--color-brand-bg-2))] px-3 py-2 text-center text-brand-text transition-transform active:scale-[0.98] disabled:opacity-40"
          aria-label="Дальше"
        >
          <div className="whitespace-nowrap text-sm font-semibold text-white">Дальше ➡️</div>
        </button>

        <button
          type="button"
          onClick={onLike}
          disabled={disabled}
          className="flex min-h-[3.75rem] items-center justify-center rounded-[1.25rem] border border-brand-like/35 bg-[color:color-mix(in_oklab,var(--color-brand-like)_14%,var(--color-brand-bg-2))] px-3 py-2 text-center text-brand-text transition-transform active:scale-[0.98] disabled:opacity-40"
          aria-label="Лайк"
        >
          <div className="whitespace-nowrap text-sm font-semibold text-white">Лайк ❤️</div>
        </button>
      </div>
    </div>
  )
}
