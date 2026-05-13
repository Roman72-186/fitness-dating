import { getProfile, writeAction, checkMutualLike, writeMatch } from '@/lib/db'
import { notifyMatch, notifyNewLike } from '@/lib/notify'
import type { ActionType, ActionSource } from '@/types'

export interface ActionResult {
  ok: true
  action: ActionType
  isMatch: boolean
  contact?: {
    name: string
    phone: string | null
    telegram_username: string | null
  }
}

export async function handleAction(
  userId: string,
  targetId: string,
  action: ActionType,
  source: ActionSource,
): Promise<ActionResult> {
  const targetProfile = await getProfile(targetId)

  if (!targetProfile) {
    throw new Error('PROFILE_NOT_FOUND')
  }

  await writeAction(userId, targetId, action, source)

  if (action === 'skip') {
    return { ok: true, action: 'skip', isMatch: false }
  }

  // Сначала проверяем взаимность — чтобы при мэтче не слать лишний notifyNewLike
  const isMatch = await checkMutualLike(userId, targetId)

  if (isMatch) {
    await writeMatch(userId, targetId)
    notifyMatch(userId, targetId).catch(() => {})

    const { prisma } = await import('@/lib/db')
    const partner = await prisma.user.findUnique({
      where: { telegram_id: targetId },
      select: { name: true, phone: true, telegram_username: true },
    })

    return {
      ok: true,
      action: 'like',
      isMatch: true,
      contact: {
        name: partner?.name ?? targetProfile.name,
        phone: partner?.phone ?? null,
        telegram_username: partner?.telegram_username ?? null,
      },
    }
  }

  // Не мэтч — обычное уведомление лайкнутому. После проверки isMatch, чтобы не было дубля.
  notifyNewLike(targetId, userId).catch(() => {})

  return { ok: true, action: 'like', isMatch: false }
}
