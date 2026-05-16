'use client'

import { Heart, X } from 'lucide-react'

interface Props {
  onLike: () => void
  onSkip: () => void
  disabled?: boolean
  className?: string
}

export function ActionButtons({ onLike, onSkip, disabled, className = 'shrink-0 px-4 pb-4 pt-3' }: Props) {
  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-3 rounded-[1.7rem] border border-white/10 bg-brand-bg-2/80 p-3 shadow-panel backdrop-blur-sm">
        <button
          type="button"
          onClick={onSkip}
          disabled={disabled}
          className="flex min-h-[4.5rem] items-center justify-between rounded-[1.4rem] border border-brand-skip/35 bg-[color:color-mix(in_oklab,var(--color-brand-skip)_12%,var(--color-brand-bg-2))] px-4 py-3 text-left text-brand-text transition-transform active:scale-[0.98] disabled:opacity-40"
          aria-label="Пропустить"
        >
          <div className="text-base font-semibold text-white">Не моё</div>
          <X className="h-7 w-7 text-brand-skip" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={onLike}
          disabled={disabled}
          className="flex min-h-[4.5rem] items-center justify-between rounded-[1.4rem] border border-brand-like/35 bg-[color:color-mix(in_oklab,var(--color-brand-like)_14%,var(--color-brand-bg-2))] px-4 py-3 text-left text-brand-text transition-transform active:scale-[0.98] disabled:opacity-40"
          aria-label="Лайк"
        >
          <div className="text-base font-semibold text-white">Интересно</div>
          <Heart className="h-7 w-7 fill-current text-brand-like" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
