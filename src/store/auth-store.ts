import { create } from 'zustand'

interface AuthState {
  token: string | null
  userId: string | null
  setAuth: (token: string, userId: string) => void
  clear: () => void
}

/**
 * Zustand store для хранения JWT токена и telegram_id
 * Инициализируется при первом открытии через useToken()
 */
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  setAuth: (token, userId) => set({ token, userId }),
  clear: () => set({ token: null, userId: null }),
}))
