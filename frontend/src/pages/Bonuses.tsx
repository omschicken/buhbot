import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../store/useUIStore'
import { getBonuses } from '../api/bonus'

interface Bonus {
  id: string
  label?: string
  name?: string
  amount: number
  currency?: string
  wagering?: number
  wageringRequirement?: number
  wageredAmount?: number
  done?: number
  total?: number
  wageringTarget?: number
  expiresAt?: string
  expires?: string
  color?: string
  status?: string
}

const COLORS = ['#e4a832', '#22c55e', '#0ea5e9', '#a855f7']

export default function Bonuses() {
  const [code, setCode] = useState('')
  const { addToast } = useUIStore()
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBonuses()
      .then((r) => setBonuses(r.data?.bonuses || r.data || []))
      .catch(() => setBonuses([]))
      .finally(() => setLoading(false))
  }, [])

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
        <button onClick={() => { if (code) addToast('Promo code applied!', 'success') }} style={{ background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 12, padding: '8px 18px', borderRadius: 7, border: 'none' }}>Apply</button>
      </div>

      {loading ? (
        <div style={{ color: '#444', fontSize: 13, padding: 20 }}>Loading bonuses...</div>
      ) : bonuses.length === 0 ? (
        <div style={{ color: '#444', fontSize: 13, padding: 20, textAlign: 'center' }}>No active bonuses</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {bonuses.map((b, i) => {
            const done = b.wageredAmount ?? b.done ?? 0
            const total = b.wageringTarget ?? b.total ?? 1
            const pct = Math.min(100, Math.round((done / total) * 100))
            const color = b.color || COLORS[i % COLORS.length]
            const label = b.label || b.name || 'Bonus'
            const currency = b.currency || 'USDT'
            const wagering = b.wagering ?? b.wageringRequirement ?? 0
            const expires = b.expiresAt ? new Date(b.expiresAt).toLocaleDateString() : b.expires || ''
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                style={{ background: '#1a1a1a', border: `1px solid ${color}20`, borderRadius: 10, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: 9, color, background: color + '15', padding: '2px 7px', borderRadius: 20 }}>{b.status || 'Active'}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color, marginBottom: 2 }}>{b.amount} {currency}</div>
                <div style={{ fontSize: 9, color: '#444', marginBottom: 10 }}>×{wagering} wagering{expires ? ` · expires ${expires}` : ''}</div>
                <div style={{ background: '#111', borderRadius: 4, height: 5, marginBottom: 5 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
                    style={{ height: '100%', background: color, borderRadius: 4 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#444' }}>
                  <span>${done.toLocaleString()}</span><span>{pct}% · ${total.toLocaleString()}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
