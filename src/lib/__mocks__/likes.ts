interface MockLike {
  id: string
  id_tg: string    // target
  id_tg_m: string  // liker
  imia_m: string
  vozrast_m: string
  klub_m: string
  gorod_m: string
  o_sebe_m: string
  foto_m: string
}

export const mockLikes: MockLike[] = [
  {
    id: 'mock-like-1',
    id_tg: '9999',
    id_tg_m: '1001',
    imia_m: 'Алексей', vozrast_m: '28', klub_m: 'FitLife', gorod_m: 'Москва', o_sebe_m: 'Люблю спорт', foto_m: '',
  },
  {
    id: 'mock-like-2',
    id_tg: '9999',
    id_tg_m: '1002',
    imia_m: 'Дмитрий', vozrast_m: '31', klub_m: 'WorldClass', gorod_m: 'Москва', o_sebe_m: '', foto_m: '',
  },
]
