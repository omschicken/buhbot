import { useState } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../store/useUIStore'

const bonuses = [
  { id: '1', label: 'Welcome Bonus', amount: 500, currency: 'USDT', wagering: 30, done: 6500, total: 15000, expires: '2024-02-15', color: '#e4a832' },
  { id: '2', label: 'Free Spins', amount: 50, currency: 'FS', wagering: 40, done: 2100, total: 5000, expires: '2024-01-28', color: '#22c55e' },
  { id: '3', label: 'Reload Bonus', amount: 200, currency: 'USDT', wagering: 25, done: 0, total: 5000, expires: '2024-01-22', color: '#0ea5e9' },
]

export default function Bonuses() {
  const [code, setCode] = useState('')
  const { addToast } = useUIStore()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 3, height: 24, background: '#e4a832', borderRadius: 2 }} />
        <span style={{ fontSize: 14, fontWeight: 700 }}>Your Bonuses</span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: 14 }}>
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PROMO CODE"
          style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', fontFamily: 'monospace', letterSpacing: 1 }}
          onFocus={(e) => (e.target.style.borderColor = 'rgba(228,168,50,0.5)')}
          onBlur={(e) => (e.target.style.borderColor = '#2a2a2a')} />
        <button onClick={() => addToast('Promo code applied!', 'success')} style={{ background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 12, padding: '8px 18px', borderRadius: 7, border: 'none' }}>Apply</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {bonuses.map((b, i) => {
          const pct = Math.round((b.done / b.total) * 100)
          return (
            <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              style={{ background: '#1a1a1a', border: `1px solid ${b.color}20`, borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{b.label}</span>
                <span style={{ fontSize: 9, color: b.color, background: b.color + '15', padding: '2px 7px', borderRadius: 20 }}>Active</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: b.color, marginBottom: 2 }}>{b.amount} {b.currency}</div>
              <div style={{ fontSize: 9, color: '#444', marginBottom: 10 }}>×{b.wagering} wagering · expires {b.expires}</div>
              <div style={{ background: '#111', borderRadius: 4, height: 5, marginBottom: 5 }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                  style={{ height: '100%', background: b.color, borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#444' }}>
                <span>${b.done.toLocaleString()}</span><span>{pct}% · ${b.total.toLocaleString()}</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
