import { create } from 'zustand'

interface Toast {
  id: string
  message: string
  type?: 'success' | 'error' | 'info'
}

interface UIState {
  toasts: Toast[]
  isLoading: boolean
  addToast: (message: string, type?: Toast['type']) => void
  removeToast: (id: string) => void
  setLoading: (v: boolean) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  toasts: [],
  isLoading: false,
  addToast: (message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    const toasts = get().toasts.slice(-2)
    set({ toasts: [...toasts, { id, message, type }] })
    setTimeout(() => get().removeToast(id), 2500)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  setLoading: (isLoading) => set({ isLoading }),
}))
