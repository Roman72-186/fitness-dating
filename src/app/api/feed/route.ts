import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { fetchAllProfiles, fetchProfile, fetchViewedIds } from '@/lib/watbot-api'
import { buildFeed } from '@/lib/filtering'
import { getCachedFeed, setCachedFeed } from '@/lib/redis'

export async function GET(req: NextRequest) {
  const userId = await getAuthUser(req)
  if (!userId) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  try {
    const isGuest = userId.startsWith('guest_')

    // Сначала проверяем кэш — если попали, отдаём без лишних WATBOT-запросов
    const cachedIds = await getCachedFeed(userId)
    if (cachedIds && cachedIds.length > 0) {
      const allProfiles = await fetchAllProfiles()
      const profileMap = new Map(allProfiles.map((p) => [p.user_id, p]))
      const profiles = cachedIds.slice(0, 10).map((id) => profileMap.get(id)).filter(Boolean)
      return NextResponse.json({ profiles, hasMore: cachedIds.length > 10 })
    }

    // Кэш пуст — грузим всё параллельно
    // Гости: профиль и просмотры в WATBOT не запрашиваем
    const [allProfiles, me, viewedIds] = await Promise.all([
      fetchAllProfiles(),
      isGuest ? Promise.resolve(null) : fetchProfile(userId),
      isGuest ? Promise.resolve(new Set<string>()) : fetchViewedIds(userId),
    ])

    const feed = buildFeed(allProfiles, me, viewedIds)
    const feedIds = feed.map((p) => p.user_id)

    await setCachedFeed(userId, feedIds)

    return NextResponse.json({
      profiles: feed.slice(0, 10),
      hasMore: feed.length > 10,
    })
  } catch (err) {
    console.error('[api/feed] Ошибка:', err)
    return NextResponse.json({ error: 'Ошибка загрузки ленты' }, { status: 500 })
  }
}
