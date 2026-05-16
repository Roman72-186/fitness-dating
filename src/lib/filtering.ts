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

function isCompatible(candidate: Profile, me: Profile): boolean {
  return me.interested_in === 'all' || candidate.gender === me.interested_in
}

// 4-тировая приоритизация:
//   tier1 — тот же клуб + город
//   tier2 — тот же клуб
//   tier3 — тот же город
//   tier4 — остальные
// Фильтр по полу смотрит на выбор зрителя и gender кандидата.
// candidate.interested_in влияет только на выдачу самого кандидата, когда ленту строят для него.
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
  const tier4: Profile[] = []

  for (const p of candidates) {
    const sameCity = !!p.city && p.city === me.city
    const sameClub =
      !!p.club && p.club === me.club && !isOtherClub(p.club) && !myClubIsOther

    if (sameClub && sameCity) tier1.push(p)
    else if (sameClub) tier2.push(p)
    else if (sameCity) tier3.push(p)
    else tier4.push(p)
  }

  return [...shuffle(tier1), ...shuffle(tier2), ...shuffle(tier3), ...shuffle(tier4)]
}
