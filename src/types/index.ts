export interface Profile {
  user_id: string
  name: string
  age: number
  gender: 'male' | 'female' | 'other'
  preference: 'male' | 'female' | 'any'
  about: string
  photos: string[]   // одно фото из анкеты
  city: string
  club: string
  active: boolean
  // training_time отсутствует в реальных данных WATBOT
}

export type Action = 'like' | 'skip'
