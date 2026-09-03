import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

interface Game {
  id: string; name: string; provider: string; category: string
  emoji?: string; hot?: boolean; isNew?: boolean; isLive?: boolean
}

export default function GameCard({ game, index }: { game: Game; index: number }) {
  const [hovered, setHovered] = useState(false)
  const nav = useNavigate()

  return (
    <motion.div
      className="game-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => nav(`/game/${game.id}`)}
      style={{
        background: '#1a1a1a', border: `1px solid ${hovered ? 'rgba(228,168,50,0.6)' : '#222'}`,
        borderRadius: 10, overflow: 'hidden', cursor: 'none', position: 'relative',
        transform: hovered ? 'scale(1.06) translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 8px 28px rgba(228,168,50,0.15)' : 'none',
        transition: 'transform 0.22s, border-color 0.22s, box-shadow 0.22s',
      }}
    >
      {/* Image area */}
      <div style={{ height: 90, background: '#202020', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, position: 'relative' }}>
        {game.emoji || '🎮'}
        {/* Badges */}
        <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {game.hot && <span style={{ background: '#e4a832', color: '#000', fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 3 }}>HOT</span>}
          {game.isNew && <span style={{ background: '#22c55e', color: '#000', fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 3 }}>NEW</span>}
          {game.isLive && <span style={{ background: '#ef4444', color: '#fff', fontSize: 8, fontWeight: 800, padding: '2px 5px', borderRadius: 3, animation: 'blink 1.5s infinite' }}>LIVE</span>}
        </div>
        {/* Play overlay */}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: hovered ? 1 : 0, transition: 'opacity 0.2s',
        }}>
          <span style={{ color: '#e4a832', fontWeight: 800, fontSize: 12 }}>▶ Play</span>
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: '7px 8px' }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{game.name}</div>
        <div style={{ fontSize: 9, color: '#444', marginTop: 2 }}>{game.provider}</div>
      </div>
    </motion.div>
  )
}
