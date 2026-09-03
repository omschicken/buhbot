import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'

const VIP_LEVELS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']
const VIP_COLORS = ['#cd7f32', '#c0c0c0', '#ffd700', '#e5e4e2', '#00d4ff']

export default function ProfilePage() {
  const { user } = useAuthStore()
  const vipLevel = user?.vipLevel || 3
  const vipProgress = 67

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold gradient-text mb-8">Profile</motion.h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* User card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 neon-border">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#7c3aed] flex items-center justify-center text-2xl font-bold text-black">
              {(user?.username?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{user?.username || 'Player'}</h2>
              <p className="text-white/40 text-sm">{user?.email || 'player@example.com'}</p>
            </div>
          </div>
          <div className="space-y-3">
            {[['Member since', 'Jan 2024'], ['Total games', '847'], ['Win rate', '43.2%']].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-white/40">{k}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* KYC */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">KYC Verification</h3>
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${
            user?.kycStatus === 'approved' ? 'bg-[#00ff88]/10 text-[#00ff88]' : user?.kycStatus === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
          }`}>
            <span>{user?.kycStatus === 'approved' ? '✓' : user?.kycStatus === 'rejected' ? '✕' : '⏳'}</span>
            <span className="capitalize">{user?.kycStatus || 'pending'}</span>
          </div>
          {user?.kycStatus !== 'approved' && (
            <div className="space-y-2">
              {['Passport / ID', 'Proof of Address'].map((doc) => (
                <button key={doc} className="w-full glass rounded-xl p-3 text-left text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between">
                  <span>📄 {doc}</span><span className="text-white/30 text-xs">Upload →</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* VIP */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">VIP Status</h3>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">👑</span>
            <div>
              <p className="font-bold text-xl" style={{ color: VIP_COLORS[vipLevel - 1] }}>{VIP_LEVELS[vipLevel - 1]}</p>
              <p className="text-white/40 text-sm">Level {vipLevel}</p>
            </div>
          </div>
          <div className="flex gap-1 mb-3">
            {VIP_LEVELS.map((lvl, i) => (
              <div key={lvl} className="flex-1 h-1.5 rounded-full transition-all"
                style={{ background: i < vipLevel ? VIP_COLORS[i] : '#ffffff10' }} />
            ))}
          </div>
          <div className="flex justify-between text-xs text-white/40 mb-4">
            <span>$12,400 wagered</span><span>$5,000 to {VIP_LEVELS[vipLevel]} →</span>
          </div>
          <div className="bg-dark-700 rounded-xl p-3">
            <div className="h-2 rounded-full bg-dark-600 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${vipProgress}%` }} transition={{ duration: 1, delay: 0.5 }}
                className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${VIP_COLORS[vipLevel - 1]}, ${VIP_COLORS[vipLevel] || '#fff'})` }} />
            </div>
            <p className="text-white/40 text-xs mt-2">{vipProgress}% to {VIP_LEVELS[vipLevel]}</p>
          </div>
        </motion.div>

        {/* Rakeback */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">Rakeback</h3>
          <div className="text-5xl font-bold gradient-text mb-2">15%</div>
          <p className="text-white/40 text-sm mb-4">Your current rakeback rate</p>
          <div className="space-y-2">
            {[['Earned this week', '$48.20'], ['Earned this month', '$184.50'], ['Total earned', '$1,240.80']].map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm p-3 bg-dark-700/50 rounded-lg">
                <span className="text-white/40">{k}</span><span className="text-[#00ff88] font-mono">{v}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
