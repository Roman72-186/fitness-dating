interface MockMatch {
  id: string
  id_tg: string    // user_a
  id_tg_m: string  // user_b
  imia: string
  vozrast: string
  klub: string
  gorod: string
  o_sebe: string
  foto: string
  imia_m: string
  vozrast_m: string
  klub_m: string
  gorod_m: string
  o_sebe_m: string
  foto_m: string
  username: string | null
}

export const mockMatches: MockMatch[] = [
  {
    id: 'mock-match-1',
    id_tg: '9999',
    id_tg_m: '1004',
    imia: 'Тест', vozrast: '27', klub: 'FitLife', gorod: 'Москва', o_sebe: '', foto: '',
    imia_m: 'Мария', vozrast_m: '25', klub_m: 'FitLife', gorod_m: 'Москва', o_sebe_m: 'Йога и бег', foto_m: '',
    username: 'maria_fit',
  },
]
