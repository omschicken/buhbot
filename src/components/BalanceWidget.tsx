import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import AnimatedCounter from './AnimatedCounter'

export default function BalanceWidget() {
  const { balance } = useAuthStore()
  return (
    <motion.div
      className="flex items-center gap-2 glass rounded-xl px-4 py-2 neon-border"
      whileHover={{ scale: 1.02 }}
    >
      <span className="text-[#00ff88]/60 text-sm">USDT</span>
      <AnimatedCounter value={balance} prefix="$" className="text-[#00ff88] font-bold font-mono text-glow-green" />
    </motion.div>
  )
}
