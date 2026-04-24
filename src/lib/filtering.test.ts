import { describe, it, expect } from 'vitest'
import { buildFeed } from './filtering'
import type { Profile } from '@/types'

const base: Profile = {
  user_id: 'me',
  name: 'Иван',
  age: 27,
  gender: 'male',
  preference: 'female',
  about: '',
  photos: [],
  city: 'Москва',
  club: 'FitLife',
  active: true,
}

function makeProfile(overrides: Partial<Profile> & { user_id: string }): Profile {
  return {
    ...base,
    gender: 'female',
    preference: 'male',
    ...overrides,
  }
}

describe('buildFeed', () => {
  it('не показывает себя', () => {
    const profiles = [base, makeProfile({ user_id: 'other1' })]
    const result = buildFeed(profiles, base, new Set())
    expect(result.find((p) => p.user_id === 'me')).toBeUndefined()
  })

  it('не показывает уже просмотренных', () => {
    const profiles = [makeProfile({ user_id: 'seen1' }), makeProfile({ user_id: 'new1' })]
    const result = buildFeed(profiles, base, new Set(['seen1']))
    expect(result.find((p) => p.user_id === 'seen1')).toBeUndefined()
    expect(result.find((p) => p.user_id === 'new1')).toBeDefined()
  })

  it('не показывает неактивные анкеты', () => {
    const profiles = [makeProfile({ user_id: 'inactive1', active: false })]
    const result = buildFeed(profiles, base, new Set())
    expect(result).toHaveLength(0)
  })

  it('фильтрует по preference — показывает только female для male.preference=female', () => {
    const profiles = [
      makeProfile({ user_id: 'female1', gender: 'female' }),
      makeProfile({ user_id: 'male1', gender: 'male' }),
    ]
    const result = buildFeed(profiles, base, new Set())
    expect(result.find((p) => p.user_id === 'male1')).toBeUndefined()
    expect(result.find((p) => p.user_id === 'female1')).toBeDefined()
  })

  it('preference=any показывает всех', () => {
    const me = { ...base, preference: 'any' as const }
    const profiles = [
      makeProfile({ user_id: 'f1', gender: 'female' }),
      makeProfile({ user_id: 'm1', gender: 'male' }),
    ]
    const result = buildFeed(profiles, me, new Set())
    expect(result).toHaveLength(2)
  })

  it('tier1 (тот же клуб) стоит перед tier3 (другой город)', () => {
    const tier1Profile = makeProfile({ user_id: 't1', club: 'FitLife', city: 'Другой' })
    const tier3Profile = makeProfile({ user_id: 't3', club: 'Other', city: 'Другой' })
    const profiles = [tier3Profile, tier1Profile]
    const result = buildFeed(profiles, base, new Set())
    const idx1 = result.findIndex((p) => p.user_id === 't1')
    const idx3 = result.findIndex((p) => p.user_id === 't3')
    expect(idx1).toBeLessThan(idx3)
  })

  it('tier2 (тот же город) стоит перед tier3 (другой город)', () => {
    const tier2Profile = makeProfile({ user_id: 't2', club: 'Other', city: 'Москва' })
    const tier3Profile = makeProfile({ user_id: 't3', club: 'Other', city: 'Другой' })
    const profiles = [tier3Profile, tier2Profile]
    const result = buildFeed(profiles, base, new Set())
    const idx2 = result.findIndex((p) => p.user_id === 't2')
    const idx3 = result.findIndex((p) => p.user_id === 't3')
    expect(idx2).toBeLessThan(idx3)
  })

  it('один профиль не попадает в два тира одновременно', () => {
    // Совпадает и клуб и город — должен быть только в tier1
    const both = makeProfile({ user_id: 'both', club: 'FitLife', city: 'Москва' })
    const result = buildFeed([both], base, new Set())
    expect(result).toHaveLength(1)
  })
})
