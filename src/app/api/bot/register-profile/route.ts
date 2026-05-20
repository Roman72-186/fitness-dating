import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertProfile, maskPhone, resetProfileViews } from '@/lib/db'
import { invalidateProfile, invalidateAllProfiles } from '@/lib/redis'
import { ensurePhotosInS3 } from '@/lib/s3'

const BOT_WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET ?? ''

const GENDER_MAP: Record<string, 'male' | 'female'> = {
  male: 'male',
  female: 'female',
  м: 'male',
  ж: 'female',
  мужской: 'male',
  женский: 'female',
  мужчина: 'male',
  женщина: 'female',
  парень: 'male',
  девушка: 'female',
  парнем: 'male',
  девушкой: 'female',
  парнями: 'male',
  девушками: 'female',
}

const INTERESTED_MAP: Record<string, 'male' | 'female' | 'all'> = {
  ...GENDER_MAP,
  all: 'all',
  любой: 'all',
  любого: 'all',
  всех: 'all',
  'не важно': 'all',
  'неважно': 'all',
  оба: 'all',
}

// WATBOT шлёт варианты вида "🙋‍♂️ Мужской" или "С девушками" — чистим от эмодзи/знаков
// и матчим по отдельным словам (не по подстроке, чтобы 'м' в "девушками" не цеплялось)
const tokenize = (v: unknown): string[] =>
  String(v ?? '')
    .toLowerCase()
    .replace(/[^a-zа-яё\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)

const matchByToken = <T>(v: unknown, map: Record<string, T>): T | unknown => {
  const tokens = tokenize(v)
  // Сначала точное совпадение всей строки (для коротких "м"/"ж")
  const joined = tokens.join(' ')
  if (joined in map) return map[joined]
  // Потом — по любому отдельному токену
  for (const t of tokens) {
    if (t in map) return map[t]
  }
  return v
}

const normalizeGender = (v: unknown) => matchByToken(v, GENDER_MAP)
const normalizeInterested = (v: unknown) => matchByToken(v, INTERESTED_MAP)

// age приходит из WATBOT строкой — приводим к числу
const ageCoerce = z.preprocess((v) => {
  if (typeof v === 'number') return v
  const n = parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? n : v
}, z.number().int().min(18).max(100))

// photos может прийти как массив, JSON-строка массива или одна URL-строка
const photosCoerce = z.preprocess((v) => {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    const s = v.trim()
    if (!s) return []
    if (s.startsWith('[')) {
      try { return JSON.parse(s) } catch { return [s] }
    }
    return s.split(/[\s,]+/).filter(Boolean)
  }
  return []
}, z.array(z.string().url()).max(5).default([]))

// Пустые строки в опциональных полях → undefined
const emptyToUndef = (v: unknown) => {
  if (typeof v === 'string' && v.trim() === '') return undefined
  return v
}

// telegram_username: убрать @, пустую → undefined
const usernameCoerce = (v: unknown) => {
  if (typeof v !== 'string') return v
  const s = v.trim().replace(/^@+/, '')
  return s === '' ? undefined : s
}

const RegisterSchema = z.object({
  platform: z.string().default('telegram'),
  bot_user_id: z.string().min(1),
  first_name: z.string().min(1).max(50),
  last_name: z.preprocess(emptyToUndef, z.string().max(50).optional()),
  age: ageCoerce,
  gender: z.preprocess(normalizeGender, z.enum(['male', 'female'])),
  interested_in: z.preprocess(normalizeInterested, z.enum(['male', 'female', 'all'])).default('all'),
  city: z.string().min(1).max(100),
  club: z.string().min(1).max(100),
  about: z.string().min(1).max(500),
  preferences: z.preprocess(emptyToUndef, z.string().max(500).optional()),
  phone: z.preprocess(emptyToUndef, z.string().max(30).optional()),
  telegram_username: z.preprocess(usernameCoerce, z.string().max(50).optional()),
  photos: photosCoerce,
})

// POST /api/bot/register-profile
// Защита: заголовок x-webhook-secret (не JWT)
// Этот endpoint в middleware.ts добавлен в publicPaths (/api/bot)
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (!BOT_WEBHOOK_SECRET || secret !== BOT_WEBHOOK_SECRET) {
    console.warn('[register-profile] Неверный webhook secret')
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Невалидный JSON' }, { status: 400 })
  }

  const parsed = RegisterSchema.safeParse(body)
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    console.warn('[register-profile] Ошибка валидации:', details)
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', details }, { status: 400 })
  }

  const d = parsed.data
  console.log(`[register-profile] bot_user_id=${d.bot_user_id} phone=${maskPhone(d.phone)}`)

  try {
    // Заливаем все внешние фото в наш S3, чтобы не зависеть от tempfile-хостов и whitelist'ов remotePatterns
    const photosInS3 = await ensurePhotosInS3(d.bot_user_id, d.photos)

    const profile = await upsertProfile({
      telegram_id: d.bot_user_id,
      name: d.first_name,
      last_name: d.last_name,
      age: d.age,
      gender: d.gender,
      interested_in: d.interested_in,
      about: d.preferences ? `${d.about}\n${d.preferences}` : d.about,
      photos: photosInS3,
      city: d.city,
      club: d.club,
      telegram_username: d.telegram_username,
      phone: d.phone,
      platform: d.platform,
    })
    await resetProfileViews(d.bot_user_id)

    await Promise.all([invalidateProfile(d.bot_user_id), invalidateAllProfiles()])

    console.log(`[register-profile] profile_id=${d.bot_user_id} сохранён`)
    return NextResponse.json({ ok: true, profile_id: profile.user_id, message: 'Profile saved successfully' })
  } catch (err) {
    console.error('[register-profile] Ошибка:', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Ошибка сохранения профиля' }, { status: 500 })
  }
}
