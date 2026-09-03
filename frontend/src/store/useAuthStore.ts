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

const storedUser = (() => {
  try { return JSON.parse(localStorage.getItem('casino_user') || 'null') } catch { return null }
})()

export const useAuthStore = create<AuthState>((set) => ({
  user: storedUser,
  balance: 0,
  isAuthenticated: !!localStorage.getItem('casino_token'),
  token: localStorage.getItem('casino_token'),
  setUser: (user, token) => {
    localStorage.setItem('casino_token', token)
    localStorage.setItem('casino_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },
  setBalance: (balance) => set({ balance }),
  logout: () => {
    localStorage.removeItem('casino_token')
    localStorage.removeItem('casino_user')
    set({ user: null, token: null, isAuthenticated: false, balance: 0 })
  },
}))
