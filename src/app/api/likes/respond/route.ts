import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { handleAction } from '@/lib/actions'

const RespondSchema = z.object({
  targetId: z.string().min(1),
  action: z.enum(['like', 'skip']),
})

// Ответ на входящий лайк (source='incoming_likes') — §34–35 инструкции
export async function POST(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId || userId.startsWith('guest_')) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Не авторизован' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Невалидный JSON' }, { status: 400 })
  }

  const parsed = RespondSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', details: parsed.error.issues }, { status: 400 })
  }

  try {
    const result = await handleAction(userId, parsed.data.targetId, parsed.data.action, 'incoming_likes')
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ ok: false, error: 'PROFILE_NOT_FOUND', message: 'Профиль не найден' }, { status: 404 })
    }
    console.error('[api/likes/respond]', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Внутренняя ошибка' }, { status: 500 })
  }
}
