'use client'

interface Props {
  onLike: () => void
  onSkip: () => void
  disabled?: boolean
}

export function ActionButtons({ onLike, onSkip, disabled }: Props) {
  return (
    <div className="px-4 pb-4 pt-3">
      <div className="rounded-[1.7rem] border border-white/10 bg-brand-bg-2/80 p-3 shadow-panel backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-brand-text-muted">
              Сделай выбор
            </p>
            <p className="mt-1 text-sm text-brand-text/80">
              Не спеши: сначала фото, потом решение.
            </p>
          </div>
          <div className="rounded-full bg-white/6 px-3 py-1 text-[0.72rem] font-medium text-brand-text-muted">
            2 действия
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onSkip}
            disabled={disabled}
            className="flex min-h-[4.75rem] items-center justify-between rounded-[1.4rem] border border-brand-skip/35 bg-[color:color-mix(in_oklab,var(--color-brand-skip)_12%,var(--color-brand-bg-2))] px-4 py-3 text-left text-brand-text transition-transform active:scale-[0.98] disabled:opacity-40"
            aria-label="Пропустить"
          >
            <div>
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-text-muted">
                Пропуск
              </div>
              <div className="mt-1 text-base font-semibold text-white">
                Не моё
              </div>
            </div>
            <span className="text-2xl text-brand-skip">×</span>
          </button>

          <button
            type="button"
            onClick={onLike}
            disabled={disabled}
            className="flex min-h-[4.75rem] items-center justify-between rounded-[1.4rem] border border-brand-like/35 bg-[color:color-mix(in_oklab,var(--color-brand-like)_14%,var(--color-brand-bg-2))] px-4 py-3 text-left text-brand-text transition-transform active:scale-[0.98] disabled:opacity-40"
            aria-label="Лайк"
          >
            <div>
              <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-brand-text-muted">
                Лайк
              </div>
              <div className="mt-1 text-base font-semibold text-white">
                Хочу узнать
              </div>
            </div>
            <span className="text-2xl text-brand-like">♥</span>
          </button>
        </div>
      </div>
    </div>
  )
}
