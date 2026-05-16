import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/admin-auth'

const ResetViewsSchema = z.object({
  telegramId: z.string().trim().min(1).regex(/^\d+$/, 'INVALID_TELEGRAM_ID'),
})

function getToken(req: NextRequest): string | null {
  return req.headers.get('authorization')?.replace('Bearer ', '') ?? null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const allowed = await verifyAdminToken(getToken(req))

  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: 'UNAUTHORIZED', message: 'Нет доступа' },
      { status: 401 },
    )
  }

  const body: unknown = await req.json().catch(() => null)
  const parsed = ResetViewsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_TELEGRAM_ID', message: 'Укажи корректный Telegram ID' },
      { status: 400 },
    )
  }

  const { telegramId } = parsed.data
  const profile = await prisma.user.findUnique({
    where: { telegram_id: telegramId },
    select: { telegram_id: true },
  })

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: 'PROFILE_NOT_FOUND', message: 'Анкета пользователя не найдена' },
      { status: 404 },
    )
  }

  const result = await prisma.profileAction.deleteMany({
    where: {
      viewer_profile_id: telegramId,
      action: 'skip',
    },
  })

  return NextResponse.json({
    ok: true,
    telegramId,
    deletedCount: result.count,
    message: result.count > 0 ? 'Просмотры пользователя сброшены' : 'У пользователя уже нет сохранённых просмотров',
  })
}
