import { create } from 'zustand'

interface GameState {
  category: string
  search: string
  setCategory: (c: string) => void
  setSearch: (s: string) => void
}

export const useGameStore = create<GameState>((set) => ({
  category: 'all',
  search: '',
  setCategory: (category) => set({ category }),
  setSearch: (search) => set({ search }),
}))
