import type { Profile } from '@/types'

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// "Другой клуб" — это метка «клуб не указан», не настоящий клуб
function isOtherClub(club?: string | null): boolean {
  return (club ?? '').trim().toLowerCase() === 'другой клуб'
}

function acceptsGender(profile: Profile, gender: Profile['gender']): boolean {
  return profile.interested_in === 'all' || profile.interested_in === gender
}

function isCompatible(candidate: Profile, me: Profile): boolean {
  return acceptsGender(me, candidate.gender) && acceptsGender(candidate, me.gender)
}

// 3-тировая приоритизация:
//   tier1 — тот же клуб + город
//   tier2 — тот же город
//   tier3 — остальные
// Фильтр по полу взаимный: зритель должен искать пол кандидата,
// а кандидат должен искать пол зрителя. interested_in=all подходит всем.
// Если me.club = "Другой клуб" — tier1 и tier2 пропускаются.
// Если candidate.club = "Другой клуб" — не считается совпадением клуба.
// me=null — гостевой режим: все активные незаблокированные без фильтрации.
export function buildFeed(
  allProfiles: Profile[],
  me: Profile | null,
  actedIds: Set<string>,
): Profile[] {
  const isActive = (p: Profile) => p.active && !p.is_blocked

  if (!me) {
    return shuffle(allProfiles.filter((p) => isActive(p) && !actedIds.has(p.user_id)))
  }

  const candidates = allProfiles.filter(
    (p) =>
      p.user_id !== me.user_id &&
      isActive(p) &&
      !actedIds.has(p.user_id) &&
      isCompatible(p, me),
  )

  const myClubIsOther = isOtherClub(me.club)

  const tier1: Profile[] = []
  const tier2: Profile[] = []
  const tier3: Profile[] = []

  for (const p of candidates) {
    const sameCity = !!p.city && p.city === me.city
    const sameClub =
      !!p.club && p.club === me.club && !isOtherClub(p.club) && !myClubIsOther

    if (sameClub && sameCity) tier1.push(p)
    else if (sameCity) tier2.push(p)
    else tier3.push(p)
  }

  return [...shuffle(tier1), ...shuffle(tier2), ...shuffle(tier3)]
}
