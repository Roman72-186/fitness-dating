import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { getProfile, upsertProfile } from '@/lib/db'
import { invalidateProfile, invalidateAllProfiles } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Не авторизован' }, { status: 401 })
  }

  try {
    const profile = await getProfile(userId)
    if (!profile) {
      return NextResponse.json({ ok: false, error: 'PROFILE_NOT_FOUND', message: 'Анкета не найдена' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, profile })
  } catch (err) {
    console.error('[api/profile GET]', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Ошибка загрузки профиля' }, { status: 500 })
  }
}

const CreateProfileSchema = z.object({
  name:              z.string().min(1).max(50),
  last_name:         z.string().max(50).optional(),
  age:               z.number().int().min(14).max(100).default(0),
  gender:            z.enum(['male', 'female', 'other']).default('other'),
  interested_in:     z.enum(['male', 'female', 'all']).default('all'),
  about:             z.string().max(500).default(''),
  photos:            z.array(z.string().url()).max(5).default([]),
  city:              z.string().max(100).default(''),
  club:              z.string().max(100).default(''),
  telegram_username: z.string().max(50).optional(),
  phone:             z.string().optional(),
})

export async function POST(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId || userId.startsWith('guest_')) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Не авторизован' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Невалидный JSON' }, { status: 400 })
  }

  const parsed = CreateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', details: parsed.error.issues }, { status: 400 })
  }

  try {
    const profile = await upsertProfile({ telegram_id: userId, ...parsed.data })
    await Promise.all([invalidateProfile(userId), invalidateAllProfiles()])
    return NextResponse.json({ ok: true, profile }, { status: 201 })
  } catch (err) {
    console.error('[api/profile POST]', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Ошибка создания профиля' }, { status: 500 })
  }
}

const ProfileUpdateSchema = z.object({
  name: z.string().min(1).max(50),
  last_name: z.string().max(50).optional(),
  age: z.number().int().min(16).max(80),
  gender: z.enum(['male', 'female', 'other']),
  interested_in: z.enum(['male', 'female', 'all']),
  about: z.string().max(500).default(''),
  photos: z.array(z.string().url()).max(5).default([]),
  city: z.string().max(100).default(''),
  club: z.string().max(100).default(''),
  telegram_username: z.string().max(50).optional(),
  // phone намеренно отсутствует — обновляется только через /api/bot/register-profile
})

export async function PUT(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId || userId.startsWith('guest_')) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Не авторизован' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Невалидный JSON' }, { status: 400 })
  }

  const parsed = ProfileUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', details: parsed.error.issues }, { status: 400 })
  }

  try {
    const profile = await upsertProfile({ telegram_id: userId, ...parsed.data })
    await Promise.all([invalidateProfile(userId), invalidateAllProfiles()])
    return NextResponse.json({ ok: true, profile })
  } catch (err) {
    console.error('[api/profile PUT]', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Ошибка сохранения профиля' }, { status: 500 })
  }
}
