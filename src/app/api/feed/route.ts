import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { getAllProfiles, getProfile, fetchActedTargetIds } from '@/lib/db'
import { buildFeed } from '@/lib/filtering'

const FEED_BATCH_SIZE = 3

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'UNAUTHORIZED', message: 'Не авторизован' }, { status: 401 })
  }

  try {
    const isGuest = userId.startsWith('guest_')
    const [allProfiles, me, actedIds] = await Promise.all([
      getAllProfiles(),
      isGuest ? Promise.resolve(null) : getProfile(userId),
      isGuest ? Promise.resolve(new Set<string>()) : fetchActedTargetIds(userId),
    ])

    if (!isGuest && !me) {
      return NextResponse.json({
        ok: false,
        error: 'PROFILE_REQUIRED',
        message: 'Анкета не найдена. Сначала пройдите регистрацию в боте.',
      }, { status: 403 })
    }

    const feed = buildFeed(allProfiles, me, actedIds)
    const profiles = feed.slice(0, FEED_BATCH_SIZE)

    return NextResponse.json({
      ok: true,
      profiles,
      hasMore: feed.length > profiles.length,
    })
  } catch (err) {
    console.error('[api/feed]', err)
    return NextResponse.json({ ok: false, error: 'INTERNAL_ERROR', message: 'Ошибка загрузки ленты' }, { status: 500 })
  }
}
