import { create } from 'zustand'

interface User { id: string; email: string; username: string; kycStatus: string; vipLevel: number }

interface AuthState {
  token: string | null
  user: User | null
  balance: number
  prevBalance: number
  setToken: (t: string) => void
  setUser: (u: User) => void
  setBalance: (b: number) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('casino_token'),
  user: null,
  balance: 1337.42,
  prevBalance: 1337.42,
  setToken: (token) => { localStorage.setItem('casino_token', token); set({ token }) },
  setUser: (user) => set({ user }),
  setBalance: (balance) => set((s) => ({ prevBalance: s.balance, balance })),
  logout: () => { localStorage.removeItem('casino_token'); set({ token: null, user: null }) },
}))
