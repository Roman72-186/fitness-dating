import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteProfile } from '@/lib/db'
import { invalidateProfile, invalidateAllProfiles } from '@/lib/redis'

const BOT_WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET ?? ''

const DeleteSchema = z.object({
  bot_user_id: z.string().min(1),
})

// POST /api/bot/delete-profile
// Защита: заголовок x-webhook-secret (тот же, что у register-profile)
// Удаляет анкету + все profile_actions + matches пользователя.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-webhook-secret')
  if (!BOT_WEBHOOK_SECRET || secret !== BOT_WEBHOOK_SECRET) {
    console.warn('[delete-profile] Неверный webhook secret')
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Невалидный JSON' }, { status: 400 })
  }

  const parsed = DeleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', details: parsed.error.issues }, { status: 400 })
  }

  const userId = parsed.data.bot_user_id

  try {
    const deleted = await deleteProfile(userId)

    if (!deleted) {
      console.log(`[delete-profile] анкета ${userId} не найдена`)
      return NextResponse.json({ ok: true, deleted: false, message: 'Анкета не найдена' })
    }

    await Promise.all([invalidateProfile(userId), invalidateAllProfiles()])

    console.log(`[delete-profile] анкета ${userId} удалена`)
    return NextResponse.json({ ok: true, deleted: true, message: 'Анкета удалена' })
  } catch (err) {
    console.error('[delete-profile] Ошибка:', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Ошибка удаления анкеты' }, { status: 500 })
  }
}
