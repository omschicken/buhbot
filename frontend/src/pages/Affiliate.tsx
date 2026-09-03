import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../store/useUIStore'
import { getAffiliateDashboard } from '../api/affiliate'

interface Dashboard {
  code?: string
  link?: string
  referralCode?: string
  referralLink?: string
  commission?: number
  commissionRate?: number
  referrals?: number
  totalReferrals?: number
  active?: number
  activeReferrals?: number
  earned?: number
  totalEarned?: number
  monthly?: number[]
  monthlyEarnings?: number[]
}

const MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D']

export default function Affiliate() {
  const { t } = useTranslation()
  const { addToast } = useUIStore()
  const [data, setData] = useState<Dashboard | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAffiliateDashboard()
      .then((r) => setData(r.data?.dashboard || r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const link = data?.link || data?.referralLink || ''
  const code = data?.code || data?.referralCode || ''
  const commission = data?.commission ?? data?.commissionRate ?? 0
  const referrals = data?.referrals ?? data?.totalReferrals ?? 0
  const active = data?.active ?? data?.activeReferrals ?? 0
  const earned = data?.earned ?? data?.totalEarned ?? 0
  const monthly: number[] = data?.monthly || data?.monthlyEarnings || Array(12).fill(0)
  const maxM = Math.max(...monthly, 1)

  const copy = () => {
    if (link) { navigator.clipboard.writeText(link); addToast(t('affiliate.copied'), 'success') }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 3, height: 24, background: '#e4a832', borderRadius: 2 }} />
        <span style={{ fontSize: 14, fontWeight: 700 }}>{t('affiliate.title')}</span>
      </div>

      {loading ? (
        <div style={{ color: '#444', fontSize: 13 }}>{t('common.loading')}</div>
      ) : !data ? (
        <div style={{ color: '#444', fontSize: 13 }}>{t('common.noData')}</div>
      ) : (
        <>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#444', letterSpacing: 0.5, marginBottom: 8 }}>{t('affiliate.referralLink').toUpperCase()}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <code style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '8px 12px', fontSize: 11, color: '#e4a832', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {link || code || '—'}
              </code>
              <button onClick={copy} style={{ background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 11, padding: '8px 16px', borderRadius: 7, border: 'none', flexShrink: 0 }}>{t('affiliate.copy')}</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            {([
              [t('affiliate.totalReferrals'), referrals, '#e4a832'],
              ['Active', active, '#22c55e'],
              [t('affiliate.commissionRate'), `${commission}%`, '#0ea5e9'],
              [t('affiliate.totalEarnings'), `$${earned.toLocaleString()}`, '#e4a832'],
            ] as const).map(([l, v, c]) => (
              <motion.div key={l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{typeof v === 'number' ? v.toLocaleString() : v}</div>
                <div style={{ fontSize: 9, color: '#444', letterSpacing: 0.5, marginTop: 4 }}>{l}</div>
              </motion.div>
            ))}
          </div>

          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Monthly Earnings</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
              {monthly.map((v, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(v / maxM) * 80}px` }} transition={{ duration: 0.5, delay: i * 0.04 }}
                    style={{ width: '100%', background: 'linear-gradient(to top, #e4a832, #e4a83260)', borderRadius: '3px 3px 0 0', minHeight: v > 0 ? 3 : 0 }} />
                  <span style={{ fontSize: 8, color: '#444' }}>{MONTHS[i]}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{t('affiliate.howItWorks')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[t('affiliate.step1'), t('affiliate.step2'), t('affiliate.step3')].map((step, i) => (
                <div key={i} style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e4a83215', border: '1px solid #e4a83240', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#e4a832' }}>{i + 1}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>{step}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
