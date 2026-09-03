import { motion } from 'framer-motion'
import { mockWinners } from '../data/mockData'

export default function WinnersTicker() {
  const items = [...mockWinners, ...mockWinners]
  return (
    <div className="overflow-hidden border-y border-white/5 bg-dark-800/50 py-3">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      >
        {items.map((w, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm flex-shrink-0">
            <span className="text-[#00ff88]">🏆</span>
            <span className="text-white/60">{w.user}</span>
            <span className="text-white/40">won</span>
            <span className="text-[#00ff88] font-bold">${w.amount.toLocaleString()}</span>
            <span className="text-white/40">on</span>
            <span className="text-white/80">{w.game}</span>
            <span className="text-[#7c3aed]">×{w.multiplier}</span>
            <span className="text-white/20 mx-2">•</span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}
