import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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

const COLORS = ['#3b82f6', '#22c55e', '#0ea5e9', '#a855f7']

export default function Bonuses() {
  const { t } = useTranslation()
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
    <div style={{ padding: 24, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 3, height: 20, background: 'var(--blue)', borderRadius: 2 }} />
        <span style={{ fontSize: 16, fontWeight: 700 }}>{t('bonuses.myBonuses')}</span>
      </div>

      {/* Promo code */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 24,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)', padding: 14,
      }}>
        <input
          value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="PROMO CODE"
          className="input"
          style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 1 }}
        />
        <button
          onClick={() => { if (code) addToast('Promo code applied!', 'success') }}
          className="btn btn-primary btn-sm"
        >
          {t('common.confirm')}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, padding: 20 }}>{t('common.loading')}</div>
      ) : bonuses.length === 0 ? (
        <div style={{
          color: 'var(--text3)', fontSize: 13, padding: '48px 20px',
          textAlign: 'center', background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
        }}>
          {t('bonuses.noBonus')}
        </div>
      ) : (
        <div className="bonuses-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
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
              <div key={b.id} style={{
                background: 'var(--surface)', border: `1px solid ${color}25`,
                borderRadius: 'var(--r-lg)', padding: 16,
                animation: `fade-in 0.2s ease ${i * 0.06}s both`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>{label}</span>
                  <span style={{ fontSize: 9, color, background: color + '18', padding: '2px 7px', borderRadius: 20, fontWeight: 700 }}>
                    {b.status || 'Active'}
                  </span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color, marginBottom: 2 }}>{b.amount} {currency}</div>
                <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 10 }}>
                  ×{wagering} wagering{expires ? ` · expires ${expires}` : ''}
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 4, height: 5, marginBottom: 5 }}>
                  <div style={{ height: '100%', background: color, borderRadius: 4, width: `${pct}%`, transition: 'width 0.8s ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text3)' }}>
                  <span>${done.toLocaleString()}</span>
                  <span>{pct}% · ${total.toLocaleString()}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .bonuses-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .bonuses-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
