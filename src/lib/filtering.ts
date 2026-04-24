import type { Profile } from '@/types'

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function matchesPreference(candidate: Profile, me: Profile): boolean {
  if (me.preference === 'any') return true
  return candidate.gender === me.preference
}

// 3-уровневая приоритизация (training_time отсутствует в реальных данных)
// tier1 — тот же клуб, tier2 — тот же город, tier3 — все остальные
// me=null — гостевой режим: все активные профили без фильтрации
export function buildFeed(
  allProfiles: Profile[],
  me: Profile | null,
  viewedIds: Set<string>
): Profile[] {
  if (!me) {
    return shuffle(allProfiles.filter((p) => p.active && !viewedIds.has(p.user_id)))
  }

  const candidates = allProfiles.filter(
    (p) =>
      p.user_id !== me.user_id &&
      p.active &&
      !viewedIds.has(p.user_id) &&
      matchesPreference(p, me)
  )

  const inTier1 = new Set<string>()
  const inTier2 = new Set<string>()

  const tier1: Profile[] = []
  const tier2: Profile[] = []
  const tier3: Profile[] = []

  for (const p of candidates) {
    if (p.club && p.club === me.club) {
      tier1.push(p)
      inTier1.add(p.user_id)
    } else if (p.city && p.city === me.city && !inTier1.has(p.user_id)) {
      tier2.push(p)
      inTier2.add(p.user_id)
    } else if (!inTier1.has(p.user_id) && !inTier2.has(p.user_id)) {
      tier3.push(p)
    }
  }

  return [...shuffle(tier1), ...shuffle(tier2), ...shuffle(tier3)]
}
