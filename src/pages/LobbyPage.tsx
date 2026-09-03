import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../store/gameStore'
import GameCard from '../components/GameCard'
import ParticlesBg from '../components/ParticlesBg'
import WinnersTicker from '../components/WinnersTicker'
import AnimatedCounter from '../components/AnimatedCounter'
import { mockGames, mockProviders } from '../data/mockData'

const CATEGORIES = [
  { id: 'all', label: 'All Games', icon: '🎮' },
  { id: 'slots', label: 'Slots', icon: '💎' },
  { id: 'live', label: 'Live', icon: '🎰' },
  { id: 'table', label: 'Table', icon: '🃏' },
]

export default function LobbyPage() {
  const { category, search, setCategory, setSearch } = useGameStore()
  const [payout, setPayout] = useState(2_847_392.50)

  useEffect(() => {
    const interval = setInterval(() => {
      setPayout((p) => p + Math.random() * 150 + 50)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const filtered = mockGames.filter((g) => {
    const matchCat = category === 'all' || g.category === category
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.provider.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative h-[500px] flex items-center overflow-hidden">
        <ParticlesBg />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dark-900/50 to-dark-900" />
        <div className="relative max-w-7xl mx-auto px-4 w-full">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <motion.p className="text-[#00ff88] text-sm font-medium tracking-widest uppercase mb-3"
              animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}>
              ● Live Casino
            </motion.p>
            <h1 className="text-5xl md:text-7xl font-bold mb-4">
              <span className="gradient-text">Win Crypto.</span>
              <br /><span className="text-white">Play Now.</span>
            </h1>
            <p className="text-white/50 text-lg mb-8 max-w-md">
              16+ games · 8 providers · Instant withdrawals
            </p>
            <div className="flex flex-wrap gap-4 items-center">
              <a href="#games" className="bg-[#00ff88] text-black font-bold px-8 py-4 rounded-xl glow-green hover:scale-105 transition-transform inline-block">
                Play Now →
              </a>
              <div className="glass rounded-xl px-6 py-4 neon-border">
                <div className="text-white/40 text-xs uppercase tracking-wider">Paid out today</div>
                <AnimatedCounter value={payout} prefix="$" decimals={2} className="text-[#00ff88] font-bold font-mono text-xl text-glow-green" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Winners ticker */}
      <WinnersTicker />

      {/* Games section */}
      <section id="games" className="max-w-7xl mx-auto px-4 py-12">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((cat) => (
            <motion.button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                category === cat.id
                  ? 'bg-[#00ff88] text-black glow-green'
                  : 'glass text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{cat.icon}</span>{cat.label}
            </motion.button>
          ))}
          {/* Search */}
          <div className="ml-auto relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search games..."
              className="glass rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00ff88]/40 w-48 border border-white/5"
            />
            {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">✕</button>}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtered.map((game, i) => <GameCard key={game.id} game={game} index={i} />)}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-white/30">
            <div className="text-5xl mb-4">🔍</div>
            <p>No games found for "{search}"</p>
          </div>
        )}
      </section>

      {/* Providers */}
      <section className="max-w-7xl mx-auto px-4 py-8 border-t border-white/5">
        <h2 className="text-white/40 text-xs uppercase tracking-widest text-center mb-6">Powered by top providers</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {mockProviders.map((p) => (
            <motion.div key={p} whileHover={{ scale: 1.05, borderColor: 'rgba(0,255,136,0.3)' }}
              className="glass rounded-xl px-5 py-3 text-white/50 text-sm font-medium transition-all">
              {p}
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
