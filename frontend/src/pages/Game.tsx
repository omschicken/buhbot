import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { mockGames } from '../hooks/useGames'

export default function Game() {
  const { id } = useParams()
  const nav = useNavigate()
  const game = mockGames.find((g) => g.id === id) || { id: '0', name: 'Game', provider: '', emoji: '🎮', category: 'slots' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a', display: 'flex', flexDirection: 'column', zIndex: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#111', borderBottom: '1px solid #222' }}>
        <button onClick={() => nav(-1)} style={{ color: '#555', background: 'none', border: 'none', fontSize: 13, padding: '4px 8px' }}>← Back</button>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{game.name}</span>
        <span style={{ fontSize: 11, color: '#444' }}>{(game as any).provider}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 3, repeat: Infinity }}
          style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 16 }}>{(game as any).emoji || '🎮'}</div>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{game.name}</div>
          <div style={{ fontSize: 12, color: '#444', marginBottom: 24 }}>Connect backend to play</div>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 20px', fontSize: 11, color: '#555' }}>
            Game iframe loads from <code style={{ color: '#e4a832' }}>POST /games/{id}/launch</code>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
