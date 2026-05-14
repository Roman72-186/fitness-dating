'use client'

import { FormEvent, useState } from 'react'
import { ArrowLeft } from 'lucide-react'

type Props = {
  onBack: () => void
  onSuccess: (token: string) => void
}

export function AdminLogin({ onBack, onSuccess }: Props) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })
      const data: unknown = await res.json()

      if (!res.ok || typeof data !== 'object' || data === null || !('token' in data)) {
        setError('Неверный логин или пароль')
        return
      }

      const token = (data as { token?: unknown }).token
      if (typeof token !== 'string' || token.length === 0) {
        setError('Не удалось получить доступ')
        return
      }

      onSuccess(token)
    } catch {
      setError('Не удалось войти. Проверь соединение.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto px-4 pb-24 pt-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/12 px-4 py-2 text-sm font-semibold text-brand-text transition active:scale-[0.98]"
      >
        <ArrowLeft size={18} />
        Назад
      </button>

      <section className="rounded-[2rem] border border-white/10 bg-brand-bg-2 p-5 shadow-panel">
        <p className="text-[0.7rem] uppercase tracking-[0.22em] text-brand-text-muted">Админка</p>
        <h1 className="mt-2 font-display text-[2rem] leading-none text-brand-text">Вход</h1>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm text-brand-text-muted">Логин</span>
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/12 bg-brand-bg px-4 text-brand-text outline-none focus:border-brand-accent"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="text-sm text-brand-text-muted">Пароль</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-white/12 bg-brand-bg px-4 text-brand-text outline-none focus:border-brand-accent"
              type="password"
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="text-sm text-brand-skip">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="min-h-12 w-full rounded-2xl bg-brand-accent px-4 py-3 text-sm font-semibold text-brand-bg transition active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Проверяем' : 'Войти'}
          </button>
        </form>
      </section>
    </div>
  )
}
