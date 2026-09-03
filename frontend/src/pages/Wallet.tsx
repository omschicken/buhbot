import { motion } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'

const txs = [
  { id: '1', type: 'deposit', label: 'Crypto Deposit', amount: 500, date: '2024-01-15 10:30', status: 'completed' },
  { id: '2', type: 'bet', label: 'Gates of Olympus', amount: -50, date: '2024-01-15 11:00', status: 'completed' },
  { id: '3', type: 'win', label: 'Gates of Olympus — Win', amount: 340, date: '2024-01-15 11:01', status: 'completed' },
  { id: '4', type: 'withdrawal', label: 'USDT Withdrawal', amount: -200, date: '2024-01-14 09:00', status: 'pending' },
  { id: '5', type: 'deposit', label: 'Bonus Deposit', amount: 100, date: '2024-01-13 08:00', status: 'completed' },
  { id: '6', type: 'bet', label: 'Lightning Roulette', amount: -100, date: '2024-01-12 20:00', status: 'completed' },
]

const txColor: Record<string, string> = { deposit: '#22c55e', withdrawal: '#ef4444', bet: '#555', win: '#e4a832' }

export default function Wallet() {
  const { balance } = useAuthStore()
  const { addToast } = useUIStore()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20 }}>
      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: 1, marginBottom: 8 }}>TOTAL BALANCE</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#e4a832', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>${balance.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: '#444', marginBottom: 16 }}>≈ {(balance / 42000).toFixed(6)} BTC</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => addToast('Deposit address copied!', 'success')} style={{ flex: 1, background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 12, padding: '9px', borderRadius: 7, border: 'none' }}>Deposit</button>
            <button style={{ flex: 1, background: '#1e1e1e', color: '#888', fontWeight: 600, fontSize: 12, padding: '9px', borderRadius: 7, border: '1px solid #2a2a2a' }}>Withdraw</button>
          </div>
        </motion.div>
        {([['Total deposited', '$5,200.00', '#22c55e'], ['Total withdrawn', '$3,840.50', '#ef4444'], ['Total won', '$8,420.00', '#e4a832']] as const).map(([l, v, c]) => (
          <div key={l} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 0.5, marginBottom: 4 }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Right — transactions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #222', fontSize: 12, fontWeight: 700 }}>Transaction History</div>
        {txs.map((tx) => (
          <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid #1e1e1e' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: txColor[tx.type] + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
              {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : tx.type === 'win' ? '🏆' : '🎲'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.label}</div>
              <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{tx.date}</div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: txColor[tx.type] }}>{tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount)}</div>
              <div style={{ fontSize: 9, color: tx.status === 'completed' ? '#22c55e' : '#f59e0b', marginTop: 2 }}>{tx.status}</div>
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
