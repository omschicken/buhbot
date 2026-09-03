import { useState } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAuthStore } from '../store/authStore'
import AnimatedCounter from '../components/AnimatedCounter'
import { mockTransactions, mockBalanceHistory } from '../data/mockData'

const TX_ICONS: Record<string, string> = { deposit: '↓', withdrawal: '↑', bet: '🎲', win: '🏆', bonus: '🎁' }
const TX_COLORS: Record<string, string> = { deposit: '#00ff88', withdrawal: '#ef4444', bet: '#f59e0b', win: '#00ff88', bonus: '#7c3aed' }

export default function WalletPage() {
  const { balance } = useAuthStore()
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawAddress, setWithdrawAddress] = useState('')

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-bold gradient-text mb-8">Wallet</motion.h1>

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {/* Balance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-6 neon-border md:col-span-1">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Total Balance</p>
          <AnimatedCounter value={balance} prefix="$" className="text-4xl font-bold font-mono gradient-text-green text-glow-green" />
          <p className="text-white/30 text-sm mt-1">≈ {(balance / 42000).toFixed(6)} BTC</p>
          <div className="mt-4 flex gap-2">
            <button className="flex-1 bg-[#00ff88] text-black font-bold py-2 rounded-xl text-sm glow-green">Deposit</button>
            <button className="flex-1 glass border border-white/10 text-white font-medium py-2 rounded-xl text-sm hover:bg-white/5">Withdraw</button>
          </div>
        </motion.div>

        {/* Stats */}
        {[
          { label: 'Total Deposited', value: '$5,200.00', color: '#00ff88' },
          { label: 'Total Withdrawn', value: '$3,840.50', color: '#7c3aed' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="glass rounded-2xl p-6">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">{stat.label}</p>
            <p className="text-2xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Balance chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Balance History</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={mockBalanceHistory}>
            <defs>
              <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" tick={{ fill: '#ffffff40', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#ffffff40', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: '#141420', border: '1px solid #00ff8830', borderRadius: 12, color: '#fff' }} />
            <Area type="monotone" dataKey="balance" stroke="#00ff88" strokeWidth={2} fill="url(#balGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Withdraw form */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-2xl p-6 mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Withdraw</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Amount (USDT)</label>
            <input value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} type="number" placeholder="0.00"
              className="w-full bg-dark-700 border border-white/5 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff88]/40 transition-colors placeholder:text-white/20" />
          </div>
          <div>
            <label className="text-white/40 text-xs uppercase tracking-wider block mb-2">Wallet Address</label>
            <input value={withdrawAddress} onChange={(e) => setWithdrawAddress(e.target.value)} type="text" placeholder="0x..."
              className="w-full bg-dark-700 border border-white/5 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff88]/40 transition-colors placeholder:text-white/20 font-mono text-sm" />
          </div>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="mt-4 bg-[#7c3aed] text-white font-bold px-8 py-3 rounded-xl glow-purple hover:bg-[#6d28d9] transition-colors">
          Submit Withdrawal
        </motion.button>
      </motion.div>

      {/* Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Transactions</h2>
        <div className="space-y-3">
          {mockTransactions.map((tx, i) => (
            <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 p-4 bg-dark-700/50 rounded-xl hover:bg-dark-700 transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                style={{ background: TX_COLORS[tx.type] + '20' }}>
                {TX_ICONS[tx.type]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-medium capitalize">{tx.type}</p>
                  {'game' in tx && <span className="text-white/40 text-xs">· {(tx as { game: string }).game}</span>}
                </div>
                <p className="text-white/30 text-xs font-mono">{new Date(tx.createdAt).toLocaleString()}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold font-mono" style={{ color: TX_COLORS[tx.type] }}>
                  {tx.amount > 0 ? '+' : ''}{tx.amount} {tx.currency}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'completed' ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {tx.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
