import { create } from 'zustand'

interface AuthState {
  token: string | null
  userId: string | null
  loading: boolean
  error: string | null
  setAuth: (token: string, userId: string) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  loading: true,
  error: null,
  setAuth: (token, userId) => set({ token, userId, loading: false, error: null }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e, loading: false }),
  clear: () => set({ token: null, userId: null, loading: false, error: null }),
}))
