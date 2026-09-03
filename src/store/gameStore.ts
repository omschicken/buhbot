import { create } from 'zustand'

type Category = 'all' | 'slots' | 'table' | 'live'

interface GameState {
  activeCategory: Category
  setCategory: (cat: string) => void
}

export const useGameStore = create<GameState>((set) => ({
  activeCategory: 'all',
  setCategory: (cat) => set({ activeCategory: cat as Category }),
}))
