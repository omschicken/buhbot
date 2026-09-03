import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import BalanceWidget from './BalanceWidget'
import { useConfetti } from '../hooks/useConfetti'

export default function Header() {
  const { token, user, logout } = useAuthStore()
  const nav = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const logoClicks = useRef(0)
  const confetti = useConfetti()

  const handleLogoClick = () => {
    logoClicks.current += 1
    if (logoClicks.current >= 5) { confetti(); logoClicks.current = 0 }
  }

  const navLinks = [
    { to: '/', label: 'Lobby' },
    { to: '/bonuses', label: 'Bonuses', badge: '3' },
    { to: '/affiliate', label: 'Affiliate' },
  ]

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-dark-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <motion.button onClick={handleLogoClick} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2">
            <motion.span
              className="text-2xl"
              animate={{ filter: ['drop-shadow(0 0 4px #00ff88)', 'drop-shadow(0 0 12px #7c3aed)', 'drop-shadow(0 0 4px #00ff88)'] }}
              transition={{ duration: 3, repeat: Infinity }}
            >🎰</motion.span>
            <span className="text-xl font-bold gradient-text">NeonBet</span>
          </motion.button>

          {/* Nav — desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link key={l.to} to={l.to} className="relative px-4 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5 flex items-center gap-1">
                {l.label}
                {l.badge && <span className="bg-[#00ff88] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">{l.badge}</span>}
              </Link>
            ))}
          </nav>

          {/* Right */}
          <div className="flex items-center gap-3">
            {token ? (
              <>
                <BalanceWidget />
                <motion.button
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setDepositOpen(true)}
                  className="hidden md:block bg-[#00ff88] text-black font-bold px-4 py-2 rounded-xl text-sm glow-green animate-glow-pulse"
                >+ Deposit</motion.button>
                <Link to="/profile" className="hidden md:flex items-center gap-2 glass rounded-xl px-3 py-2 hover:bg-white/5 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00ff88] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-black">
                    {(user?.username?.[0] || 'U').toUpperCase()}
                  </div>
                  <span className="text-sm text-white/70">{user?.username || 'Player'}</span>
                </Link>
                <button onClick={() => { logout(); nav('/') }} className="hidden md:block text-white/30 hover:text-white/60 text-sm transition-colors">Logout</button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm text-white/60 hover:text-white transition-colors px-3 py-2">Login</Link>
                <Link to="/register" className="bg-[#00ff88] text-black font-bold px-4 py-2 rounded-xl text-sm glow-green">Sign Up</Link>
              </div>
            )}
            {/* Hamburger */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden glass rounded-lg p-2">
              <div className="w-5 h-0.5 bg-white mb-1 transition-all" />
              <div className="w-5 h-0.5 bg-white mb-1 transition-all" />
              <div className="w-5 h-0.5 bg-white transition-all" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-16 left-0 right-0 z-40 bg-dark-900/95 backdrop-blur-xl border-b border-white/5 p-4 space-y-2"
          >
            {navLinks.map((l) => <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="block px-4 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors">{l.label}</Link>)}
            {token && <button onClick={() => { logout(); nav('/') }} className="block w-full text-left px-4 py-3 text-red-400 hover:bg-red-400/5 rounded-lg transition-colors">Logout</button>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {depositOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setDepositOpen(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-sm neon-border" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold gradient-text mb-4">Deposit Crypto</h2>
              <div className="bg-dark-700 rounded-xl p-4 mb-4 text-center">
                <div className="w-32 h-32 mx-auto bg-white rounded-lg flex items-center justify-center mb-3">
                  <span className="text-4xl">📱</span>
                </div>
                <p className="text-white/40 text-xs">QR Code</p>
              </div>
              <div className="bg-dark-700 rounded-lg p-3 font-mono text-xs text-[#00ff88] break-all mb-4">
                0x742d35Cc6634C0532925a3b844Bc454e4438f44e
              </div>
              <div className="flex gap-2">
                {['USDT', 'BTC', 'ETH', 'BNB'].map((coin) => (
                  <button key={coin} className="flex-1 glass rounded-lg py-2 text-xs text-white/60 hover:text-white hover:border-[#00ff88]/30 transition-colors">{coin}</button>
                ))}
              </div>
              <button onClick={() => setDepositOpen(false)} className="mt-4 w-full text-white/30 hover:text-white/60 text-sm transition-colors">Close</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
