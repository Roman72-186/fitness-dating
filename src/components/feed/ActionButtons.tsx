'use client'

interface Props {
  onLike: () => void
  onSkip: () => void
  disabled?: boolean
}

export function ActionButtons({ onLike, onSkip, disabled }: Props) {
  return (
    <div className="flex justify-center gap-8 py-4">
      <button
        onClick={onSkip}
        disabled={disabled}
        className="w-16 h-16 rounded-full bg-brand-bg-3 border-2 border-brand-skip text-brand-skip text-2xl flex items-center justify-center hover:bg-brand-skip hover:text-white active:scale-95 transition-all disabled:opacity-40 shadow-lg"
        aria-label="Пропустить"
      >
        ✕
      </button>
      <button
        onClick={onLike}
        disabled={disabled}
        className="w-16 h-16 rounded-full bg-brand-bg-3 border-2 border-brand-like text-brand-like text-2xl flex items-center justify-center hover:bg-brand-like hover:text-white active:scale-95 transition-all disabled:opacity-40 shadow-lg"
        aria-label="Лайк"
      >
        ❤
      </button>
    </div>
  )
}
