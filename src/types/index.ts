export interface Profile {
  user_id: string
  name: string
  last_name?: string
  age: number
  gender: 'male' | 'female' | 'other'
  interested_in: 'male' | 'female' | 'all'
  about: string
  photos: string[]
  city: string
  club: string
  telegram_username?: string
  // phone намеренно отсутствует — показывается только при мэтче
  active: boolean
  is_blocked?: boolean
}

export type ActionType = 'like' | 'skip'
export type ActionSource = 'feed' | 'incoming_likes'

export interface ProfileInput {
  name: string
  last_name?: string
  age: number
  gender: Profile['gender']
  interested_in: Profile['interested_in']
  about: string
  photos: string[]
  city: string
  club: string
  telegram_username?: string
  // phone принимается только через /api/bot/register-profile
}

// Ошибки в едином формате (требование инструкции)
export interface ApiError {
  ok: false
  error: string
  message?: string
  details?: unknown
}

export interface ApiSuccess<T = unknown> {
  ok: true
  data?: T
}
