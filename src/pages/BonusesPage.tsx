import { useState } from 'react'
import { motion } from 'framer-motion'
import { mockBonuses } from '../data/mockData'

export default function BonusesPage() {
  const [promoCode, setPromoCode] = useState('')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold gradient-text mb-2">Bonuses</motion.h1>
      <p className="text-white/40 mb-8">Your active bonuses and promotions</p>

      {/* Promo code */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 neon-border mb-8">
        <h2 className="text-lg font-bold text-white mb-4">🎟️ Promo Code</h2>
        <div className="flex gap-3">
          <input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="NEONBET2024"
            className="flex-1 bg-dark-700 border border-white/5 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff88]/40 transition-colors placeholder:text-white/20 font-mono tracking-wider" />
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="bg-[#00ff88] text-black font-bold px-6 py-3 rounded-xl glow-green">Apply</motion.button>
        </div>
      </motion.div>

      {/* Active bonuses */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {mockBonuses.map((bonus, i) => {
          const pct = Math.round((bonus.wagerDone / bonus.wagerTotal) * 100)
          const daysLeft = Math.ceil((new Date(bonus.expiresAt).getTime() - Date.now()) / 86400000)
          return (
            <motion.div key={bonus.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="glass rounded-2xl p-6 hover:bg-white/5 transition-colors" style={{ borderColor: bonus.color + '20' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-2xl">{bonus.type === 'welcome' ? '🎉' : bonus.type === 'freespin' ? '🎰' : '🔄'}</div>
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: bonus.color + '20', color: bonus.color }}>
                  Active
                </span>
              </div>
              <h3 className="font-bold text-white mb-1">{bonus.label}</h3>
              <p className="text-2xl font-bold font-mono mb-1" style={{ color: bonus.color }}>{bonus.amount} {bonus.currency}</p>
              <p className="text-white/30 text-xs mb-4">{daysLeft}d remaining · ×{bonus.wagering} wagering</p>
              <div className="mb-2">
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>Wagered</span><span>{pct}%</span>
                </div>
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                    className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${bonus.color}, ${bonus.color}80)` }} />
                </div>
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span>${bonus.wagerDone.toLocaleString()}</span><span>${bonus.wagerTotal.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Available promotions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Available Promotions</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { title: '100% First Deposit', desc: 'Up to $500 bonus', icon: '💰', color: '#00ff88' },
            { title: 'Weekly Reload 50%', desc: 'Every Monday', icon: '🔄', color: '#7c3aed' },
            { title: '200 Free Spins', desc: 'On Sweet Bonanza', icon: '🎰', color: '#0ea5e9' },
            { title: '20% Cashback', desc: 'On weekly losses', icon: '💸', color: '#f59e0b' },
          ].map((promo, i) => (
            <motion.div key={i} whileHover={{ scale: 1.02 }} className="bg-dark-700/50 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-dark-700 transition-colors">
              <div className="text-2xl w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: promo.color + '15' }}>{promo.icon}</div>
              <div>
                <p className="text-white font-medium text-sm">{promo.title}</p>
                <p className="text-white/40 text-xs">{promo.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
