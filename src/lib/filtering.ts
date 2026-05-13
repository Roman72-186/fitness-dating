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

// Взаимная совместимость по полу:
// - me.interested_in='all' → подходит любой кандидат (их interested_in игнорируем)
// - иначе: candidate.gender === me.interested_in И candidate.interested_in одобряет мой пол
function isCompatible(candidate: Profile, me: Profile): boolean {
  if (me.interested_in === 'all') return true
  if (candidate.gender !== me.interested_in) return false
  return candidate.interested_in === 'all' || candidate.interested_in === me.gender
}

// 4-тировая приоритизация:
//   tier1 — тот же клуб + город
//   tier2 — тот же клуб
//   tier3 — тот же город
//   tier4 — остальные
// Фильтр совместимости по полу (isCompatible) применяется одинаково ко всем тирам.
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
