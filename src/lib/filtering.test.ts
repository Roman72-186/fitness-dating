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

// Кандидат по умолчанию подходит me взаимно: female ищет male.
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

  it('не показывает кандидата, если candidate.interested_in не включает мой пол', () => {
    const result = buildFeed([p({ user_id: 'f', gender: 'female', interested_in: 'female' })], me, new Set())
    expect(result).toHaveLength(0)
  })

  it('показывает кандидата с interested_in=all, если его пол подходит мне', () => {
    const result = buildFeed([p({ user_id: 'f-all', gender: 'female', interested_in: 'all' })], me, new Set())
    expect(result).toHaveLength(1)
  })

  it('interested_in=all у me — показывает мужчин и женщин, если я тоже подхожу candidate.interested_in', () => {
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
    expect(result.map((x) => x.user_id)).toEqual(expect.arrayContaining(['f-male', 'm-male']))
    expect(result.find((x) => x.user_id === 'f-female')).toBeUndefined()
  })

  it('interested_in=all у me не обходит фильтр видимости кандидата', () => {
    const meAll = { ...me, interested_in: 'all' as const }
    const result = buildFeed(
      [
        p({ user_id: 'female-seeks-female', gender: 'female', interested_in: 'female' }),
        p({ user_id: 'male-seeks-female', gender: 'male', interested_in: 'female' }),
      ],
      meAll,
      new Set(),
    )

    expect(result).toHaveLength(0)
  })

  it('interested_in=all у me — сортирует совместимых мужчин и женщин по клубу и городу', () => {
    const meAll = { ...me, interested_in: 'all' as const }
    const sameClubAndCityMale = p({
      user_id: 'same-club-city-male',
      gender: 'male',
      interested_in: 'male',
      club: 'FitLife',
      city: 'Москва',
    })
    const sameClubAndCityFemale = p({
      user_id: 'same-club-city-female',
      gender: 'female',
      interested_in: 'male',
      club: 'FitLife',
      city: 'Москва',
    })
    const sameClub = p({
      user_id: 'same-club',
      gender: 'female',
      interested_in: 'male',
      club: 'FitLife',
      city: 'Казань',
    })
    const sameCity = p({
      user_id: 'same-city',
      gender: 'male',
      interested_in: 'male',
      club: 'Other',
      city: 'Москва',
    })
    const other = p({
      user_id: 'other',
      gender: 'female',
      interested_in: 'male',
      club: 'Other',
      city: 'Питер',
    })

    const result = buildFeed([other, sameCity, sameClub, sameClubAndCityFemale, sameClubAndCityMale], meAll, new Set())
    const resultIds = result.map((x) => x.user_id)
    const tier1Ids = resultIds.slice(0, 2)

    expect(tier1Ids).toEqual(expect.arrayContaining(['same-club-city-male', 'same-club-city-female']))
    expect(resultIds.indexOf('same-city')).toBeGreaterThan(1)
    expect(resultIds.indexOf('same-city')).toBeLessThan(resultIds.indexOf('same-club'))
    expect(resultIds.slice(3)).toEqual(expect.arrayContaining(['same-club', 'other']))
  })

  it('candidate.interested_in=all показывается, если gender кандидата подходит фильтру зрителя', () => {
    const maleViewer = { ...me, user_id: 'male-viewer', gender: 'male' as const, interested_in: 'female' as const }
    const femaleViewer = { ...me, user_id: 'female-viewer', gender: 'female' as const, interested_in: 'female' as const }
    const candidate = p({ user_id: 'candidate-all', gender: 'female', interested_in: 'all' })

    expect(buildFeed([candidate], maleViewer, new Set())).toHaveLength(1)
    expect(buildFeed([candidate], femaleViewer, new Set())).toHaveLength(1)
  })

  it('девушка ищет парня — показывает парня с interested_in=all', () => {
    const femaleViewer = { ...me, user_id: 'female-viewer', gender: 'female' as const, interested_in: 'male' as const }
    const candidate = p({ user_id: 'male-all', gender: 'male', interested_in: 'all' })

    expect(buildFeed([candidate], femaleViewer, new Set())).toHaveLength(1)
  })

  it('candidate.interested_in влияет на показ, даже если gender кандидата подходит фильтру зрителя', () => {
    const candidate = p({ user_id: 'female-seeks-female', gender: 'female', interested_in: 'female' })
    const result = buildFeed([candidate], me, new Set())

    expect(result).toHaveLength(0)
  })

  it('парень ищет девушек — видит только девушек и показывается только девушкам', () => {
    const maleViewer = { ...me, user_id: 'male-viewer', gender: 'male' as const, interested_in: 'female' as const }
    const femaleViewer = { ...me, user_id: 'female-viewer', gender: 'female' as const, interested_in: 'male' as const }
    const maleSeekingFemale = p({ user_id: 'male-seeking-female', gender: 'male', interested_in: 'female' })

    expect(buildFeed([p({ user_id: 'female-seeking-male', gender: 'female', interested_in: 'male' }), maleSeekingFemale], maleViewer, new Set()))
      .toHaveLength(1)
    expect(buildFeed([maleSeekingFemale], femaleViewer, new Set())).toHaveLength(1)
    expect(buildFeed([maleSeekingFemale], maleViewer, new Set())).toHaveLength(0)
  })

  it('парень ищет всех — видит всех взаимно подходящих и может показываться мужчинам и женщинам', () => {
    const maleViewer = { ...me, user_id: 'male-viewer', gender: 'male' as const, interested_in: 'all' as const }
    const femaleViewer = { ...me, user_id: 'female-viewer', gender: 'female' as const, interested_in: 'male' as const }
    const maleSeekingMale = p({ user_id: 'male-seeking-male', gender: 'male', interested_in: 'male' })
    const femaleSeekingMale = p({ user_id: 'female-seeking-male', gender: 'female', interested_in: 'male' })
    const maleSeekingAll = p({ user_id: 'male-seeking-all', gender: 'male', interested_in: 'all' })

    expect(buildFeed([maleSeekingMale, femaleSeekingMale], maleViewer, new Set()))
      .toHaveLength(2)
    expect(buildFeed([maleSeekingAll], maleViewer, new Set())).toHaveLength(1)
    expect(buildFeed([maleSeekingAll], femaleViewer, new Set())).toHaveLength(1)
  })

  it('парень ищет парней — видит только парней и показывается только парням', () => {
    const maleViewer = { ...me, user_id: 'male-viewer', gender: 'male' as const, interested_in: 'male' as const }
    const femaleViewer = { ...me, user_id: 'female-viewer', gender: 'female' as const, interested_in: 'male' as const }
    const maleSeekingMale = p({ user_id: 'male-seeking-male', gender: 'male', interested_in: 'male' })

    expect(buildFeed([maleSeekingMale, p({ user_id: 'female-seeking-male', gender: 'female', interested_in: 'male' })], maleViewer, new Set()))
      .toHaveLength(1)
    expect(buildFeed([maleSeekingMale], maleViewer, new Set())).toHaveLength(1)
    expect(buildFeed([maleSeekingMale], femaleViewer, new Set())).toHaveLength(0)
  })

  it('девушка ищет парней — видит только парней', () => {
    const femaleViewer = { ...me, user_id: 'female-viewer', gender: 'female' as const, interested_in: 'male' as const }
    const maleSeekingFemale = p({ user_id: 'male-seeking-female', gender: 'male', interested_in: 'female' })
    const femaleSeekingFemale = p({ user_id: 'female-seeking-female', gender: 'female', interested_in: 'female' })

    expect(buildFeed([maleSeekingFemale, femaleSeekingFemale], femaleViewer, new Set()))
      .toHaveLength(1)
  })

  it('девушка ищет всех — видит всех взаимно подходящих и может показываться мужчинам и женщинам', () => {
    const femaleViewer = { ...me, user_id: 'female-viewer', gender: 'female' as const, interested_in: 'all' as const }
    const maleViewer = { ...me, user_id: 'male-viewer', gender: 'male' as const, interested_in: 'female' as const }
    const maleSeekingFemale = p({ user_id: 'male-seeking-female', gender: 'male', interested_in: 'female' })
    const femaleSeekingFemale = p({ user_id: 'female-seeking-female', gender: 'female', interested_in: 'female' })
    const femaleSeekingAll = p({ user_id: 'female-seeking-all', gender: 'female', interested_in: 'all' })

    expect(buildFeed([maleSeekingFemale, femaleSeekingFemale], femaleViewer, new Set()))
      .toHaveLength(2)
    expect(buildFeed([femaleSeekingAll], femaleViewer, new Set())).toHaveLength(1)
    expect(buildFeed([femaleSeekingAll], maleViewer, new Set())).toHaveLength(1)
  })

  it('девушка ищет девушек — видит только девушек и показывается только девушкам', () => {
    const femaleViewer = { ...me, user_id: 'female-viewer', gender: 'female' as const, interested_in: 'female' as const }
    const maleViewer = { ...me, user_id: 'male-viewer', gender: 'male' as const, interested_in: 'female' as const }
    const femaleSeekingFemale = p({ user_id: 'female-seeking-female', gender: 'female', interested_in: 'female' })

    expect(buildFeed([femaleSeekingFemale, p({ user_id: 'male-seeking-female', gender: 'male', interested_in: 'female' })], femaleViewer, new Set()))
      .toHaveLength(1)
    expect(buildFeed([femaleSeekingFemale], femaleViewer, new Set())).toHaveLength(1)
    expect(buildFeed([femaleSeekingFemale], maleViewer, new Set())).toHaveLength(0)
  })

  it('candidate.interested_in=all не обходит мой фильтр по полу', () => {
    const candidate = p({ user_id: 'male-all', gender: 'male', interested_in: 'all' })
    const result = buildFeed([candidate], me, new Set())

    expect(result).toHaveLength(0)
  })

  it('tier1 (клуб + город) стоит перед анкетой из другого города', () => {
    const t1 = p({ user_id: 't1', club: 'FitLife', city: 'Москва' })
    const t2 = p({ user_id: 't2', club: 'FitLife', city: 'Питер' })
    const result = buildFeed([t2, t1], me, new Set())
    expect(result.findIndex((x) => x.user_id === 't1')).toBeLessThan(
      result.findIndex((x) => x.user_id === 't2'),
    )
  })

  it('tier2 (город, другой клуб) стоит перед анкетой из того же клуба, но другого города', () => {
    const t2 = p({ user_id: 't2', club: 'FitLife', city: 'Питер' })
    const t3 = p({ user_id: 't3', club: 'Other', city: 'Москва' })
    const result = buildFeed([t3, t2], me, new Set())
    expect(result.findIndex((x) => x.user_id === 't3')).toBeLessThan(
      result.findIndex((x) => x.user_id === 't2'),
    )
  })

  it('tier2 (город, другой клуб) стоит перед tier3 (всё остальное)', () => {
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
