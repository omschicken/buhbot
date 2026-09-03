import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { mockGames } from '../data/mockData'

export default function GamePage() {
  const { id } = useParams()
  const nav = useNavigate()
  const [loaded, setLoaded] = useState(false)
  const game = mockGames.find((g) => g.id === id) || { name: 'Game', provider: '', category: 'slots', id: id ?? '0', rtp: 96 }

  return (
    <div className="fixed inset-0 bg-dark-900 flex flex-col z-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-800/80 backdrop-blur border-b border-white/5">
        <button onClick={() => nav(-1)} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <span>←</span><span className="text-sm">Back</span>
        </button>
        <div className="text-center">
          <p className="text-white font-medium text-sm">{game.name}</p>
          <p className="text-white/40 text-xs">{game.provider}</p>
        </div>
        <div className="text-[#00ff88] text-xs font-mono">RTP {game.rtp}%</div>
      </div>

      {/* Game iframe */}
      <div className="flex-1 relative">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-900">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-12 h-12 border-2 border-[#00ff88] border-t-transparent rounded-full" />
          </div>
        )}
        <iframe
          src="about:blank"
          onLoad={() => setLoaded(true)}
          className="w-full h-full border-0"
          title={game.name}
        />
        {/* Demo overlay when iframe is about:blank */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-dark-800 to-dark-900">
          <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-8xl mb-6">
            {game.category === 'live' ? '🎰' : game.category === 'table' ? '🃏' : '💎'}
          </motion.div>
          <h2 className="text-3xl font-bold gradient-text mb-2">{game.name}</h2>
          <p className="text-white/40 mb-8">by {game.provider}</p>
          <div className="glass rounded-xl px-8 py-4 neon-border text-center">
            <p className="text-white/60 text-sm">Game would load here in production</p>
            <p className="text-[#00ff88] text-xs mt-1">Connect backend to enable real gameplay</p>
          </div>
        </div>
      </div>
    </div>
  )
}
