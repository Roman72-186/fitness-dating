'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'

type GroupRow = {
  name: string
  count: number
}

type AdminStatsPayload = {
  periods: {
    day1: number
    day7: number
    day15: number
    day30: number
  }
  byCity: GroupRow[]
  byClub: GroupRow[]
  byGender: {
    male: number
    female: number
  }
}

type Props = {
  token: string
  onBack: () => void
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-brand-bg-2 p-4 shadow-panel">
      <p className="text-[0.68rem] uppercase tracking-[0.18em] text-brand-text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-brand-text">{value}</p>
    </div>
  )
}

function GroupList({ title, rows }: { title: string; rows: GroupRow[] }) {
  return (
    <section className="rounded-[1.7rem] border border-white/10 bg-brand-bg-2 p-4 shadow-panel">
      <h2 className="font-display text-xl text-brand-text">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? rows.map((row) => (
          <div key={row.name} className="flex items-center justify-between gap-4 rounded-2xl bg-brand-bg px-4 py-3">
            <span className="min-w-0 truncate text-sm text-brand-text">{row.name}</span>
            <span className="font-display text-xl text-brand-text">{row.count}</span>
          </div>
        )) : (
          <p className="text-sm text-brand-text-muted">Данных нет</p>
        )}
      </div>
    </section>
  )
}

function ResetOption({
  checked,
  description,
  label,
  onChange,
}: {
  checked: boolean
  description: string
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-brand-bg px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 accent-brand-accent"
      />
      <span>
        <span className="block text-sm font-semibold text-brand-text">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-brand-text-muted">{description}</span>
      </span>
    </label>
  )
}

export function AdminStats({ token, onBack }: Props) {
  const [stats, setStats] = useState<AdminStatsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [telegramId, setTelegramId] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState<string | null>(null)
  const [resetSkips, setResetSkips] = useState(true)
  const [resetLikes, setResetLikes] = useState(false)
  const [resetMatches, setResetMatches] = useState(false)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data: unknown = await res.json()

      if (!res.ok || typeof data !== 'object' || data === null || !('stats' in data)) {
        setError('Не удалось загрузить статистику')
        return
      }

      setStats((data as { stats: AdminStatsPayload }).stats)
    } catch {
      setError('Не удалось загрузить статистику')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  async function handleResetViews(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (!resetSkips && !resetLikes && !resetMatches) {
      setResetError('Выбери, что именно сбросить')
      setResetSuccess(null)
      return
    }

    setResetLoading(true)
    setResetError(null)
    setResetSuccess(null)

    try {
      const res = await fetch('/api/admin/reset-views', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ telegramId, resetSkips, resetLikes, resetMatches }),
      })
      const data: unknown = await res.json()

      if (!res.ok || typeof data !== 'object' || data === null || !('message' in data)) {
        setResetError('Не удалось сбросить просмотры')
        return
      }

      const message = (data as { message?: unknown }).message
      if (typeof message !== 'string' || message.length === 0) {
        setResetError('Не удалось сбросить просмотры')
        return
      }

      setResetSuccess(message)
      await fetchStats()
    } catch {
      setResetError('Не удалось сбросить просмотры')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 pb-24 pt-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 px-4 py-2 text-sm font-semibold text-brand-text transition active:scale-[0.98]"
        >
          <ArrowLeft size={18} />
          Назад
        </button>
        <button
          type="button"
          onClick={fetchStats}
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-brand-bg-2 px-4 py-2 text-sm font-semibold text-brand-text transition active:scale-[0.98]"
        >
          <RefreshCw size={17} />
          Обновить
        </button>
      </div>

      <header className="mb-5">
        <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">Админка</p>
        <h1 className="mt-2 font-display text-[2rem] leading-none text-brand-text">Статистика</h1>
      </header>

      {loading ? <p className="text-sm text-brand-text-muted">Загружаем статистику</p> : null}
      {error ? <p className="text-sm text-brand-skip">{error}</p> : null}

      {stats ? (
        <div className="space-y-5">
          <section className="rounded-[1.7rem] border border-white/10 bg-brand-bg-2 p-4 shadow-panel">
            <h2 className="font-display text-xl text-brand-text">Сброс просмотров</h2>
            <p className="mt-2 text-sm text-brand-text-muted">
              Введи Telegram ID пользователя, чтобы очистить его историю просмотренных анкет.
            </p>

            <form className="mt-4 space-y-3" onSubmit={handleResetViews}>
              <label className="block">
                <span className="text-sm text-brand-text-muted">Telegram ID</span>
                <input
                  value={telegramId}
                  onChange={(event) => setTelegramId(event.target.value.replace(/[^\d]/g, ''))}
                  className="mt-2 min-h-12 w-full rounded-2xl border border-white/12 bg-brand-bg px-4 text-brand-text outline-none focus:border-brand-accent"
                  inputMode="numeric"
                  placeholder="Например, 123456789"
                />
              </label>

              <div className="space-y-2">
                <ResetOption
                  checked={resetSkips}
                  onChange={setResetSkips}
                  label="Пропуски"
                  description="Вернуть в ленту анкеты, которые пользователь скипнул."
                />
                <ResetOption
                  checked={resetLikes}
                  onChange={setResetLikes}
                  label="Лайки"
                  description="Удалить исходящие лайки пользователя, чтобы эти анкеты снова могли появиться."
                />
                <ResetOption
                  checked={resetMatches}
                  onChange={setResetMatches}
                  label="Мэтчи"
                  description="Удалить взаимные пары пользователя из раздела мэтчей."
                />
              </div>

              {resetError ? <p className="text-sm text-brand-skip">{resetError}</p> : null}
              {resetSuccess ? <p className="text-sm text-brand-accent">{resetSuccess}</p> : null}

              <button
                type="submit"
                disabled={resetLoading || telegramId.length === 0 || (!resetSkips && !resetLikes && !resetMatches)}
                className="min-h-12 w-full rounded-2xl bg-brand-accent px-4 py-3 text-sm font-semibold text-brand-bg transition active:scale-[0.98] disabled:opacity-50"
              >
                {resetLoading ? 'Сбрасываем' : 'Сбросить просмотры'}
              </button>
            </form>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <StatCard label="1 день" value={stats.periods.day1} />
            <StatCard label="7 дней" value={stats.periods.day7} />
            <StatCard label="15 дней" value={stats.periods.day15} />
            <StatCard label="30 дней" value={stats.periods.day30} />
          </section>

          <section className="grid grid-cols-2 gap-3">
            <StatCard label="Мужчин" value={stats.byGender.male} />
            <StatCard label="Женщин" value={stats.byGender.female} />
          </section>

          <GroupList title="По городам" rows={stats.byCity} />
          <GroupList title="По клубам" rows={stats.byClub} />
        </div>
      ) : null}
    </div>
  )
}
