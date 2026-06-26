import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { upsertProfile, maskPhone } from '@/lib/db'
import { invalidateProfile, invalidateAllProfiles } from '@/lib/redis'
import { ensurePhotosInS3 } from '@/lib/s3'

const BOT_WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET ?? ''

const GENDER_ALIASES: Record<string, 'male' | 'female'> = {
  male: 'male',
  female: 'female',
  м: 'male',
  ж: 'female',
  мужской: 'male',
  женский: 'female',
  мужчина: 'male',
  женщина: 'female',
  парень: 'male',
  парнем: 'male',
  парнями: 'male',
  девушка: 'female',
  девушкой: 'female',
  девушками: 'female',
}

const INTERESTED_ALIASES: Record<string, 'male' | 'female' | 'all'> = {
  ...GENDER_ALIASES,
  any: 'all',
  all: 'all',
  любой: 'all',
  любого: 'all',
  все: 'all',
  всех: 'all',
  'все равно': 'all',
  'не важно': 'all',
  неважно: 'all',
  оба: 'all',
}

function tokenize(value: unknown): string[] {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-zа-яё\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function normalizeText(value: unknown): string {
  return tokenize(value).join(' ')
}

function matchAlias<T>(value: unknown, map: Record<string, T>): T | undefined {
  const normalized = normalizeText(value)
  if (!normalized) return undefined
  if (normalized in map) return map[normalized]

  for (const token of normalized.split(' ')) {
    if (token in map) return map[token]
  }

  return undefined
}

function normalizeGender(value: unknown): unknown {
  const alias = matchAlias(value, GENDER_ALIASES)
  if (alias) return alias

  const normalized = normalizeText(value)
  if (normalized.includes('муж') || normalized.includes('парн')) return 'male'
  if (normalized.includes('жен') || normalized.includes('девуш')) return 'female'

  return value
}

function normalizeInterested(value: unknown): unknown {
  const alias = matchAlias(value, INTERESTED_ALIASES)
  if (alias) return alias

  const normalized = normalizeText(value)
  if (
    normalized.includes('any') ||
    normalized.includes('all') ||
    normalized.includes('все равно') ||
    normalized.includes('не важно') ||
    normalized.includes('неважно')
  ) {
    return 'all'
  }

  if (normalized.includes('парн') || normalized.includes('муж')) return 'male'
  if (normalized.includes('девуш') || normalized.includes('жен')) return 'female'

  return value
}

const ageCoerce = z.preprocess((value) => {
  if (typeof value === 'number') return value
  const parsed = parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) ? parsed : value
}, z.number().int().min(18).max(100))

const photosCoerce = z.preprocess((value) => {
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        return JSON.parse(trimmed)
      } catch {
        return [trimmed]
      }
    }
    return trimmed.split(/[\s,]+/).filter(Boolean)
  }

  return []
}, z.array(z.string().url()).max(5).default([]))

function emptyToUndefined(value: unknown): unknown {
  if (typeof value === 'string' && value.trim() === '') return undefined
  return value
}

function usernameCoerce(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const normalized = value.trim().replace(/^@+/, '')
  return normalized === '' ? undefined : normalized
}

const RegisterSchema = z.object({
  platform: z.string().default('telegram'),
  bot_user_id: z.string().min(1),
  first_name: z.string().min(1).max(50),
  last_name: z.preprocess(emptyToUndefined, z.string().max(50).optional()),
  age: ageCoerce,
  gender: z.preprocess(normalizeGender, z.enum(['male', 'female'])),
  interested_in: z.preprocess(normalizeInterested, z.enum(['male', 'female', 'all'])).default('all'),
  city: z.string().min(1).max(100),
  club: z.string().min(1).max(100),
  about: z.string().min(1).max(500),
  preferences: z.preprocess(emptyToUndefined, z.string().max(500).optional()),
  phone: z.preprocess(emptyToUndefined, z.string().max(30).optional()),
  telegram_username: z.preprocess(usernameCoerce, z.string().max(50).optional()),
  photos: photosCoerce,
})

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (!BOT_WEBHOOK_SECRET || secret !== BOT_WEBHOOK_SECRET) {
    console.warn('[register-profile] Неверный webhook secret')
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'VALIDATION_ERROR', message: 'Невалидный JSON' },
      { status: 400 },
    )
  }

  const parsed = RegisterSchema.safeParse(body)
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    console.warn('[register-profile] Ошибка валидации:', details)

    if (typeof body === 'object' && body !== null) {
      const rawInterestedIn =
        'interested_in' in body ? String((body as { interested_in?: unknown }).interested_in ?? '') : ''
      if (rawInterestedIn) {
        console.warn(`[register-profile] raw interested_in="${rawInterestedIn}"`)
      }
    }

    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', details }, { status: 400 })
  }

  const data = parsed.data
  console.log(`[register-profile] bot_user_id=${data.bot_user_id} phone=${maskPhone(data.phone)}`)

  try {
    const photosInS3 = await ensurePhotosInS3(data.bot_user_id, data.photos)

    const profile = await upsertProfile({
      telegram_id: data.bot_user_id,
      name: data.first_name,
      last_name: data.last_name,
      age: data.age,
      gender: data.gender,
      interested_in: data.interested_in,
      about: data.preferences ? `${data.about}\n${data.preferences}` : data.about,
      photos: photosInS3,
      city: data.city,
      club: data.club,
      telegram_username: data.telegram_username,
      phone: data.phone,
      platform: data.platform,
    })

    await Promise.all([invalidateProfile(data.bot_user_id), invalidateAllProfiles()])

    console.log(`[register-profile] profile_id=${data.bot_user_id} сохранён`)
    return NextResponse.json({ ok: true, profile_id: profile.user_id, message: 'Profile saved successfully' })
  } catch (err) {
    console.error('[register-profile] Ошибка:', err)
    return NextResponse.json(
      { ok: false, error: 'INTERNAL_ERROR', message: 'Ошибка сохранения профиля' },
      { status: 500 },
    )
  }
}
