import { useQuery } from '@tanstack/react-query'
import { getGames } from '../api/games'

export const mockGames = [
  { id: '1', name: 'Gates of Olympus', provider: 'Pragmatic Play', category: 'slots', emoji: '⚡', hot: true },
  { id: '2', name: 'Sweet Bonanza', provider: 'Pragmatic Play', category: 'slots', emoji: '🍬', hot: true },
  { id: '3', name: 'Book of Dead', provider: 'Play\'n GO', category: 'slots', emoji: '📖' },
  { id: '4', name: 'Crazy Time', provider: 'Evolution', category: 'live', emoji: '🎡', isNew: true },
  { id: '5', name: 'Dog House', provider: 'Pragmatic Play', category: 'slots', emoji: '🐕', hot: true },
  { id: '6', name: 'Wanted Dead or a Wild', provider: 'Hacksaw', category: 'slots', emoji: '🤠', isNew: true },
  { id: '7', name: 'Lightning Roulette', provider: 'Evolution', category: 'live', emoji: '⚡', isLive: true },
  { id: '8', name: 'Blackjack VIP', provider: 'Evolution', category: 'live', emoji: '🃏', isLive: true },
  { id: '9', name: 'Mega Moolah', provider: 'Microgaming', category: 'slots', emoji: '🦁' },
  { id: '10', name: 'Gonzo\'s Quest', provider: 'NetEnt', category: 'slots', emoji: '🏺' },
  { id: '11', name: 'Starburst', provider: 'NetEnt', category: 'slots', emoji: '⭐' },
  { id: '12', name: 'Baccarat', provider: 'Evolution', category: 'live', emoji: '🎴', isLive: true },
  { id: '13', name: 'Fruit Party', provider: 'Pragmatic Play', category: 'slots', emoji: '🍓', isNew: true },
  { id: '14', name: 'Big Bass Bonanza', provider: 'Pragmatic Play', category: 'slots', emoji: '🎣' },
  { id: '15', name: 'Texas Hold\'em', provider: 'Evolution', category: 'table', emoji: '♠️' },
  { id: '16', name: 'Monopoly Live', provider: 'Evolution', category: 'live', emoji: '🎩', isLive: true },
  { id: '17', name: 'Razor Shark', provider: 'Push Gaming', category: 'slots', emoji: '🦈', isNew: true },
  { id: '18', name: 'Wolf Gold', provider: 'Pragmatic Play', category: 'slots', emoji: '🐺' },
]

export function useGames(category?: string) {
  return useQuery({
    queryKey: ['games', category],
    queryFn: async () => {
      try {
        const res = await getGames(category)
        return res.data?.data || mockGames
      } catch {
        return category ? mockGames.filter((g) => g.category === category) : mockGames
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}
