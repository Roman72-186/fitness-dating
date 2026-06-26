import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/admin-auth'

const ResetViewsSchema = z.object({
  telegramId: z.string().trim().min(1).regex(/^\d+$/, 'INVALID_TELEGRAM_ID'),
  resetSkips: z.boolean().default(true),
  resetLikes: z.boolean().default(false),
  resetMatches: z.boolean().default(false),
}).refine((data) => data.resetSkips || data.resetLikes || data.resetMatches, {
  message: 'RESET_SCOPE_REQUIRED',
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
      { ok: false, error: 'INVALID_RESET_REQUEST', message: 'Укажи Telegram ID и хотя бы один пункт для сброса' },
      { status: 400 },
    )
  }

  const { telegramId, resetSkips, resetLikes, resetMatches } = parsed.data
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

  const [skips, likes, matches] = await prisma.$transaction([
    resetSkips
      ? prisma.profileAction.deleteMany({
          where: {
            viewer_profile_id: telegramId,
            action: 'skip',
          },
        })
      : prisma.profileAction.deleteMany({ where: { id: -1 } }),
    resetLikes
      ? prisma.profileAction.deleteMany({
          where: {
            viewer_profile_id: telegramId,
            action: 'like',
          },
        })
      : prisma.profileAction.deleteMany({ where: { id: -1 } }),
    resetMatches
      ? prisma.match.deleteMany({
          where: {
            OR: [
              { user_a_id: telegramId },
              { user_b_id: telegramId },
            ],
          },
        })
      : prisma.match.deleteMany({ where: { id: -1 } }),
  ])

  const deletedCount = skips.count + likes.count + matches.count
  const details = {
    skips: skips.count,
    likes: likes.count,
    matches: matches.count,
  }
  const messageParts = [
    resetSkips ? `пропуски: ${skips.count}` : null,
    resetLikes ? `лайки: ${likes.count}` : null,
    resetMatches ? `мэтчи: ${matches.count}` : null,
  ].filter((part): part is string => part !== null)

  return NextResponse.json({
    ok: true,
    telegramId,
    deletedCount,
    details,
    message: deletedCount > 0
      ? `Сброс выполнен (${messageParts.join(', ')})`
      : 'По выбранным пунктам нечего сбрасывать',
  })
}
