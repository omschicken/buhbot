import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

interface Game { id: string; name: string; provider: string; category: string; rtp: number; hot?: boolean; isNew?: boolean }

const CATEGORY_COLORS: Record<string, string> = {
  slots: '#7c3aed', live: '#00ff88', table: '#0ea5e9',
}

const GRADIENTS = [
  'from-purple-900 to-indigo-900', 'from-green-900 to-teal-900', 'from-blue-900 to-cyan-900',
  'from-orange-900 to-red-900', 'from-pink-900 to-purple-900', 'from-yellow-900 to-orange-900',
]

export default function GameCard({ game, index }: { game: Game; index: number }) {
  const nav = useNavigate()
  const [hovered, setHovered] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const card = cardRef.current!
    const rect = card.getBoundingClientRect()
    const x = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2) * -10
    const y = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2) * 10
    setTilt({ x, y })
  }

  const gradient = GRADIENTS[index % GRADIENTS.length]

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setTilt({ x: 0, y: 0 }); setHovered(false) }}
      onMouseEnter={() => setHovered(true)}
      className="relative group"
    >
      <motion.div
        animate={{ rotateX: tilt.x, rotateY: tilt.y }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="glass rounded-xl overflow-hidden glass-hover transition-all duration-300 cursor-pointer"
        onClick={() => nav(`/game/${game.id}`)}
      >
        {/* Game Image / Gradient Placeholder */}
        <div className={`relative h-36 bg-gradient-to-br ${gradient} overflow-hidden`}>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl mb-1">{game.category === 'live' ? '🎰' : game.category === 'table' ? '🃏' : '💎'}</span>
            <span className="text-white/60 text-xs">{game.provider}</span>
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {game.hot && <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">🔥 HOT</span>}
            {game.isNew && <span className="bg-[#7c3aed] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">⚡ NEW</span>}
          </div>

          {/* RTP */}
          <div className="absolute top-2 right-2 bg-black/50 backdrop-blur text-[10px] text-[#00ff88] px-1.5 py-0.5 rounded font-mono">
            RTP {game.rtp}%
          </div>

          {/* Play overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: hovered ? 1 : 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center"
          >
            <motion.button
              initial={{ scale: 0.8 }} animate={{ scale: hovered ? 1 : 0.8 }}
              className="bg-[#00ff88] text-black font-bold px-6 py-2 rounded-full text-sm glow-green"
            >▶ PLAY</motion.button>
          </motion.div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-white font-medium text-sm truncate">{game.name}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-white/40 text-xs">{game.provider}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize"
              style={{ background: CATEGORY_COLORS[game.category] + '20', color: CATEGORY_COLORS[game.category] }}>
              {game.category}
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
