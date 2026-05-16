'use client'

import { Heart, X } from 'lucide-react'

interface Props {
  onLike: () => void
  onSkip: () => void
  disabled?: boolean
  className?: string
  compact?: boolean
}

export function ActionButtons({ onLike, onSkip, disabled, className = 'shrink-0 px-4 pb-4 pt-3', compact = false }: Props) {
  const panelClass = compact
    ? 'grid grid-cols-2 gap-2 rounded-[1.25rem] border border-white/10 bg-brand-bg-2/80 p-2 shadow-panel backdrop-blur-sm'
    : 'grid grid-cols-2 gap-3 rounded-[1.7rem] border border-white/10 bg-brand-bg-2/80 p-3 shadow-panel backdrop-blur-sm'
  const buttonClass = compact
    ? 'flex min-h-[3.2rem] items-center justify-between rounded-[1rem] px-3 py-2 text-left text-brand-text transition-transform active:scale-[0.98] disabled:opacity-40'
    : 'flex min-h-[4.5rem] items-center justify-between rounded-[1.4rem] px-4 py-3 text-left text-brand-text transition-transform active:scale-[0.98] disabled:opacity-40'
  const labelClass = compact ? 'text-sm font-semibold text-white' : 'text-base font-semibold text-white'
  const iconClass = compact ? 'h-6 w-6' : 'h-7 w-7'

  return (
    <div className={className}>
      <div className={panelClass}>
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className={`${buttonClass} border border-brand-skip/35 bg-[color:color-mix(in_oklab,var(--color-brand-skip)_12%,var(--color-brand-bg-2))]`}
          aria-label="Пропустить"
        >
          <div className={labelClass}>Не моё</div>
          <X className={`${iconClass} text-brand-skip`} aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onLike}
          disabled={disabled}
          className={`${buttonClass} border border-brand-like/35 bg-[color:color-mix(in_oklab,var(--color-brand-like)_14%,var(--color-brand-bg-2))]`}
          aria-label="Лайк"
        >
          <div className={labelClass}>Интересно</div>
          <Heart className={`${iconClass} fill-current text-brand-like`} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
