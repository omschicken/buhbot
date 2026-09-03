import { motion, AnimatePresence } from 'framer-motion'

interface Props { open: boolean; onClose: () => void }

export default function KonamiScreen({ open, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-center"
          >
            <motion.div
              animate={{ textShadow: ['0 0 10px #00ff88', '0 0 40px #7c3aed', '0 0 10px #00ff88'] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-8xl mb-6"
            >🎰</motion.div>
            <h1 className="text-5xl font-bold gradient-text mb-4">CHEAT CODE ACTIVATED</h1>
            <p className="text-[#00ff88] text-xl mb-2">↑↑↓↓←→←→BA</p>
            <p className="text-white/40 text-sm">You found the secret. Now go win some crypto.</p>
            <motion.div
              className="mt-8 grid grid-cols-3 gap-4 text-center"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            >
              {['x2 Balance', 'Free Spins', 'VIP Status'].map((perk) => (
                <div key={perk} className="glass rounded-xl p-4 neon-border">
                  <div className="text-[#00ff88] font-bold">{perk}</div>
                  <div className="text-white/40 text-xs">Unlocked</div>
                </div>
              ))}
            </motion.div>
            <p className="text-white/20 text-xs mt-8">Click anywhere to close</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
