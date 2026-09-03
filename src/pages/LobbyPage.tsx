import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getGames } from '../api/games'
import GameCard from '../components/GameCard'

const mockGames = [
  { id: '1', name: 'Book of Ra', provider: 'Novomatic', category: 'slots', rtp: 96.1 },
  { id: '2', name: 'Starburst', provider: 'NetEnt', category: 'slots', rtp: 96.1 },
  { id: '3', name: 'Blackjack Pro', provider: 'Evolution', category: 'table', rtp: 99.5 },
  { id: '4', name: 'Roulette Live', provider: 'Evolution', category: 'live', rtp: 97.3 },
  { id: '5', name: 'Sweet Bonanza', provider: 'Pragmatic', category: 'slots', rtp: 96.5 },
  { id: '6', name: 'Gates of Olympus', provider: 'Pragmatic', category: 'slots', rtp: 96.5 },
  { id: '7', name: 'Crazy Time', provider: 'Evolution', category: 'live', rtp: 96.1 },
  { id: '8', name: 'Texas Holdem', provider: 'Playtech', category: 'table', rtp: 98.6 },
  { id: '9', name: 'Wolf Gold', provider: 'Pragmatic', category: 'slots', rtp: 96.0 },
  { id: '10', name: 'Lightning Roulette', provider: 'Evolution', category: 'live', rtp: 97.3 },
  { id: '11', name: 'Baccarat', provider: 'Ezugi', category: 'table', rtp: 98.9 },
  { id: '12', name: 'Fruit Party', provider: 'Pragmatic', category: 'slots', rtp: 96.5 },
]

const categories = [
  { key: 'all', label: 'All Games' },
  { key: 'slots', label: '🎰 Slots' },
  { key: 'table', label: '🃏 Table' },
  { key: 'live', label: '📺 Live' },
]

function SkeletonCard() {
  return (
    <div className="bg-[#16213e] rounded-xl border border-white/5 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-white/5" />
      <div className="p-3">
        <div className="h-4 bg-white/10 rounded mb-2" />
        <div className="h-3 bg-white/5 rounded w-2/3" />
      </div>
    </div>
  )
}

export default function LobbyPage() {
  const [category, setCategory] = useState('all')

  const { data, isLoading } = useQuery({
    queryKey: ['games', category],
    queryFn: () => getGames(category === 'all' ? undefined : category),
    retry: false,
  })

  const apiGames = data?.data?.games || data?.data || []
  const games = apiGames.length > 0 ? apiGames : mockGames

  const filteredGames = category === 'all'
    ? games
    : games.filter((g: { category: string }) => g.category === category)

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      {/* Hero */}
      <div className="relative bg-gradient-to-r from-[#0f3460] via-[#16213e] to-[#1a1a2e] py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, #00ff88 0%, transparent 50%), radial-gradient(circle at 70% 50%, #0f3460 0%, transparent 50%)'
        }} />
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-4">
            Play & <span className="text-[#00ff88]">Win Big</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            Thousands of games. Instant payouts. Join over 1 million players worldwide.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-2"><span className="text-[#00ff88]">✓</span> Licensed & Regulated</span>
            <span className="flex items-center gap-2"><span className="text-[#00ff88]">✓</span> Instant Crypto Withdrawals</span>
            <span className="flex items-center gap-2"><span className="text-[#00ff88]">✓</span> 24/7 Support</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex-shrink-0 px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                category === cat.key
                  ? 'bg-[#00ff88] text-[#1a1a2e]'
                  : 'bg-[#16213e] text-gray-400 hover:text-white border border-white/10 hover:border-white/20'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Game grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)
            : filteredGames.map((game: { id: string; name: string; provider: string; category: string; imageUrl?: string; rtp?: number }) => (
                <GameCard key={game.id} {...game} />
              ))
          }
        </div>

        {!isLoading && filteredGames.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            No games found in this category.
          </div>
        )}
      </div>
    </div>
  )
}
