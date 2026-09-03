import { useState } from 'react'
import { motion } from 'framer-motion'

const AFFILIATE = {
  referralCode: 'NEONBET-X7K2',
  referralLink: 'https://neonbet.io/ref/NEONBET-X7K2',
  commissionRate: 0.35,
  totalReferrals: 47,
  activePlayers: 23,
  totalEarnings: 3840.50,
  monthlyEarnings: [120, 240, 180, 350, 420, 380, 290, 460, 510, 380, 420, 490],
  months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
}

const MAX_EARNING = Math.max(...AFFILIATE.monthlyEarnings)

export default function AffiliatePage() {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(AFFILIATE.referralLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold gradient-text mb-2">Affiliate</motion.h1>
      <p className="text-white/40 mb-8">Earn {AFFILIATE.commissionRate * 100}% commission on every referral</p>

      {/* Referral link */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 neon-border mb-6">
        <h2 className="text-lg font-bold text-white mb-4">🔗 Your Referral Link</h2>
        <div className="flex gap-3">
          <code className="flex-1 bg-dark-700 rounded-xl px-4 py-3 text-[#00ff88] text-sm font-mono truncate border border-white/5">
            {AFFILIATE.referralLink}
          </code>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={copy}
            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${copied ? 'bg-dark-600 text-[#00ff88]' : 'bg-[#00ff88] text-black glow-green'}`}>
            {copied ? '✓ Copied' : 'Copy'}
          </motion.button>
        </div>
        <p className="text-white/30 text-xs mt-2">Code: <span className="text-white/60 font-mono">{AFFILIATE.referralCode}</span></p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Referrals', value: AFFILIATE.totalReferrals.toString(), color: '#00ff88', icon: '👥' },
          { label: 'Active Players', value: AFFILIATE.activePlayers.toString(), color: '#7c3aed', icon: '🎮' },
          { label: 'Commission Rate', value: `${AFFILIATE.commissionRate * 100}%`, color: '#0ea5e9', icon: '💹' },
          { label: 'Total Earned', value: `$${AFFILIATE.totalEarnings.toLocaleString()}`, color: '#f59e0b', icon: '💰' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass rounded-2xl p-5">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <p className="text-white/40 text-xs uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Earnings chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-6">Monthly Earnings</h2>
        <div className="flex items-end gap-2 h-40">
          {AFFILIATE.monthlyEarnings.map((val, i) => (
            <motion.div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }} animate={{ height: `${(val / MAX_EARNING) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="w-full rounded-t-lg min-h-[4px]"
                style={{ background: `linear-gradient(to top, #7c3aed, #00ff88)`, opacity: 0.7 + (val / MAX_EARNING) * 0.3 }}
              />
              <span className="text-white/30 text-[10px]">{AFFILIATE.months[i]}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* How it works */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Share your link', desc: 'Share your unique referral link with friends' },
            { step: '2', title: 'They sign up', desc: 'Friends register and make their first deposit' },
            { step: '3', title: 'Earn forever', desc: 'Earn 35% of the house edge for life' },
          ].map((s) => (
            <div key={s.step} className="bg-dark-700/50 rounded-xl p-4 text-center">
              <div className="w-8 h-8 rounded-full bg-[#00ff88]/10 text-[#00ff88] font-bold flex items-center justify-center mx-auto mb-3">{s.step}</div>
              <p className="text-white font-medium text-sm mb-1">{s.title}</p>
              <p className="text-white/40 text-xs">{s.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
