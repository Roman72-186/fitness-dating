import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { handleAction } from '@/lib/actions'

const ActionSchema = z.object({
  targetId: z.string().min(1),
  action: z.enum(['like', 'skip']),
})

export async function POST(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Не авторизован' }, { status: 401 })
  }

  let body: unknown
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', message: 'Невалидный JSON' }, { status: 400 })
  }

  const parsed = ActionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'VALIDATION_ERROR', details: parsed.error.issues }, { status: 400 })
  }

  if (userId.startsWith('guest_')) {
    return NextResponse.json(
      { ok: false, error: 'GUEST_FORBIDDEN', message: 'Зарегистрируйся через бота, чтобы лайкать анкеты' },
      { status: 403 },
    )
  }

  try {
    const result = await handleAction(userId, parsed.data.targetId, parsed.data.action, 'feed')
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ ok: false, error: 'PROFILE_NOT_FOUND', message: 'Профиль не найден' }, { status: 404 })
    }
    console.error('[api/action]', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Внутренняя ошибка' }, { status: 500 })
  }
}
