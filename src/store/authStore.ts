import { create } from 'zustand'

interface User {
  id: string
  email: string
  username: string
  kycStatus: string
}

interface AuthState {
  token: string | null
  user: User | null
  balance: number
  setToken: (token: string) => void
  setUser: (user: User) => void
  setBalance: (balance: number) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('casino_token'),
  user: null,
  balance: 0,
  setToken: (token) => {
    localStorage.setItem('casino_token', token)
    set({ token })
  },
  setUser: (user) => set({ user }),
  setBalance: (balance) => set({ balance }),
  logout: () => {
    localStorage.removeItem('casino_token')
    set({ token: null, user: null, balance: 0 })
  },
}))
