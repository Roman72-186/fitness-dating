import { describe, it, expect } from 'vitest'
import { buildFeed } from './filtering'
import type { Profile } from '@/types'

const me: Profile = {
  user_id: 'me',
  name: 'Иван',
  age: 27,
  gender: 'male',
  interested_in: 'female',
  about: '',
  photos: [],
  city: 'Москва',
  club: 'FitLife',
  active: true,
}

// Кандидат по умолчанию совместим с me (female, ищет male)
function p(overrides: Partial<Profile> & { user_id: string }): Profile {
  return {
    ...me,
    gender: 'female',
    interested_in: 'male',
    ...overrides,
  }
}

describe('buildFeed', () => {
  it('не показывает себя', () => {
    const result = buildFeed([me, p({ user_id: 'other' })], me, new Set())
    expect(result.find((x) => x.user_id === 'me')).toBeUndefined()
  })

  it('не показывает уже просмотренных', () => {
    const result = buildFeed([p({ user_id: 'seen' }), p({ user_id: 'new' })], me, new Set(['seen']))
    expect(result.find((x) => x.user_id === 'seen')).toBeUndefined()
    expect(result.find((x) => x.user_id === 'new')).toBeDefined()
  })

  it('не показывает неактивные анкеты', () => {
    const result = buildFeed([p({ user_id: 'off', active: false })], me, new Set())
    expect(result).toHaveLength(0)
  })

  it('не показывает заблокированных', () => {
    const result = buildFeed([p({ user_id: 'blocked', is_blocked: true })], me, new Set())
    expect(result).toHaveLength(0)
  })

  it('не показывает кандидата неподходящего пола', () => {
    const result = buildFeed([p({ user_id: 'm', gender: 'male', interested_in: 'female' })], me, new Set())
    expect(result).toHaveLength(0)
  })

  it('не показывает кандидата, которому не подходит мой пол', () => {
    // Девушка, но ищет тоже девушек — Иван (male) ей не подходит
    const result = buildFeed([p({ user_id: 'f', gender: 'female', interested_in: 'female' })], me, new Set())
    expect(result).toHaveLength(0)
  })

  it('показывает кандидата с interested_in=all, если его пол подходит мне', () => {
    const result = buildFeed([p({ user_id: 'f-all', gender: 'female', interested_in: 'all' })], me, new Set())
    expect(result).toHaveLength(1)
  })

  it('interested_in=all у me — показывает всех (не смотрит их предпочтения)', () => {
    const meAll = { ...me, interested_in: 'all' as const }
    const result = buildFeed(
      [
        p({ user_id: 'f-male', gender: 'female', interested_in: 'male' }),
        p({ user_id: 'm-male', gender: 'male', interested_in: 'male' }),
        p({ user_id: 'f-female', gender: 'female', interested_in: 'female' }),
      ],
      meAll,
      new Set(),
    )
    expect(result).toHaveLength(2)
  })

  it('tier1 (клуб + город) стоит перед tier2 (клуб, другой город)', () => {
    const t1 = p({ user_id: 't1', club: 'FitLife', city: 'Москва' })
    const t2 = p({ user_id: 't2', club: 'FitLife', city: 'Питер' })
    const result = buildFeed([t2, t1], me, new Set())
    expect(result.findIndex((x) => x.user_id === 't1')).toBeLessThan(
      result.findIndex((x) => x.user_id === 't2'),
    )
  })

  it('tier2 (клуб, другой город) стоит перед tier3 (город, другой клуб)', () => {
    const t2 = p({ user_id: 't2', club: 'FitLife', city: 'Питер' })
    const t3 = p({ user_id: 't3', club: 'Other', city: 'Москва' })
    const result = buildFeed([t3, t2], me, new Set())
    expect(result.findIndex((x) => x.user_id === 't2')).toBeLessThan(
      result.findIndex((x) => x.user_id === 't3'),
    )
  })

  it('tier3 (город, другой клуб) стоит перед tier4 (всё остальное)', () => {
    const t3 = p({ user_id: 't3', club: 'Other', city: 'Москва' })
    const t4 = p({ user_id: 't4', club: 'Other', city: 'Питер' })
    const result = buildFeed([t4, t3], me, new Set())
    expect(result.findIndex((x) => x.user_id === 't3')).toBeLessThan(
      result.findIndex((x) => x.user_id === 't4'),
    )
  })

  it('один профиль не попадает в два тира', () => {
    const both = p({ user_id: 'both', club: 'FitLife', city: 'Москва' })
    expect(buildFeed([both], me, new Set())).toHaveLength(1)
  })

  it('candidate.club = "Другой клуб" не считается совпадением клуба', () => {
    const meOther = { ...me, club: 'Другой клуб' }
    const sameCityOther = p({ user_id: 'other-city', club: 'Другой клуб', city: 'Москва' })
    const sameCityReal = p({ user_id: 'real', club: 'Other', city: 'Москва' })
    const result = buildFeed([sameCityOther, sameCityReal], meOther, new Set())
    expect(result).toHaveLength(2)
  })

  it('me.club = "Другой клуб" → tier1 и tier2 пусты', () => {
    const meOther = { ...me, club: 'Другой клуб' }
    const sameCity = p({ user_id: 'city', club: 'FitLife', city: 'Москва' })
    const farAway = p({ user_id: 'far', club: 'FitLife', city: 'Питер' })
    const result = buildFeed([farAway, sameCity], meOther, new Set())
    expect(result.findIndex((x) => x.user_id === 'city')).toBeLessThan(
      result.findIndex((x) => x.user_id === 'far'),
    )
  })

  it('"другой клуб" сравнивается case-insensitive', () => {
    const meOther = { ...me, club: 'ДРУГОЙ КЛУБ' }
    const cand = p({ user_id: 'c', club: 'другой клуб', city: 'Москва' })
    const result = buildFeed([cand], meOther, new Set())
    expect(result).toHaveLength(1)
  })

  it('interested_in=female: парни в выдачу НЕ попадают (даже в tier4)', () => {
    const onlyMales = [
      p({ user_id: 'm1', gender: 'male', interested_in: 'female', club: 'FitLife', city: 'Москва' }),
      p({ user_id: 'm2', gender: 'male', interested_in: 'female', club: 'Other', city: 'Питер' }),
    ]
    const result = buildFeed(onlyMales, me, new Set())
    expect(result).toHaveLength(0)
  })

  it('interested_in=all у me + same club + same city → tier1', () => {
    const meAll = { ...me, interested_in: 'all' as const }
    const t1 = p({ user_id: 't1', gender: 'male', interested_in: 'male', club: 'FitLife', city: 'Москва' })
    const t4 = p({ user_id: 't4', gender: 'female', interested_in: 'male', club: 'X', city: 'Питер' })
    const result = buildFeed([t4, t1], meAll, new Set())
    expect(result.findIndex((x) => x.user_id === 't1')).toBeLessThan(
      result.findIndex((x) => x.user_id === 't4'),
    )
  })

  it('гостевой режим (me=null) — все активные без фильтрации', () => {
    const profiles = [
      p({ user_id: 'f', gender: 'female' }),
      p({ user_id: 'm', gender: 'male' }),
    ]
    const result = buildFeed(profiles, null, new Set())
    expect(result).toHaveLength(2)
  })
})
