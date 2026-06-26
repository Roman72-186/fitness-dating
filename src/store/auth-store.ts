import { create } from 'zustand'

interface AuthState {
  token: string | null
  userId: string | null
  loading: boolean
  error: string | null
  hasProfile: boolean | null
  setAuth: (token: string, userId: string) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setHasProfile: (v: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  loading: true,
  error: null,
  hasProfile: null,
  setAuth: (token, userId) => set({ token, userId, loading: false, error: null, hasProfile: null }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e, loading: false }),
  setHasProfile: (v) => set({ hasProfile: v }),
  clear: () => set({ token: null, userId: null, loading: false, error: null, hasProfile: null }),
}))
