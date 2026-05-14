'use client'

import type { LucideIcon } from 'lucide-react'
import { LoaderCircle } from 'lucide-react'

interface AppStateProps {
  label: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  icon?: LucideIcon
  loading?: boolean
  className?: string
}

export function AppState({
  label,
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
  loading,
  className = '',
}: AppStateProps) {
  return (
    <div className={`flex h-full min-h-[100dvh] items-center justify-center px-6 py-10 text-center ${className}`}>
      <section className="w-full max-w-sm">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-brand-bg-2 shadow-panel">
          {loading ? (
            <LoaderCircle className="h-7 w-7 animate-spin text-brand-accent" aria-hidden="true" />
          ) : Icon ? (
            <Icon className="h-7 w-7 text-brand-accent" aria-hidden="true" />
          ) : null}
        </div>

        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-brand-text-muted">{label}</p>
        <h1 className="mt-3 font-display text-3xl leading-none text-brand-text">{title}</h1>

        {description ? (
          <p className="mx-auto mt-4 max-w-[32ch] text-sm leading-6 text-brand-text-muted">{description}</p>
        ) : null}

        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="mt-7 inline-flex min-h-12 items-center justify-center rounded-2xl bg-brand-accent px-5 py-3 text-sm font-semibold text-brand-bg transition duration-200 hover:opacity-90 active:scale-[0.99]"
          >
            {actionLabel}
          </button>
        ) : null}
      </section>
    </div>
  )
}
