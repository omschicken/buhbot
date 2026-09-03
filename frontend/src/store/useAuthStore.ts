import { create } from 'zustand'

interface User {
  id: string
  email: string
  username: string
  role: string
}

interface AuthState {
  user: User | null
  balance: number
  isAuthenticated: boolean
  token: string | null
  setUser: (user: User, token: string) => void
  setBalance: (balance: number) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  balance: 0,
  isAuthenticated: !!localStorage.getItem('casino_token'),
  token: localStorage.getItem('casino_token'),
  setUser: (user, token) => {
    localStorage.setItem('casino_token', token)
    set({ user, token, isAuthenticated: true })
  },
  setBalance: (balance) => set({ balance }),
  logout: () => {
    localStorage.removeItem('casino_token')
    set({ user: null, token: null, isAuthenticated: false, balance: 0 })
  },
}))
