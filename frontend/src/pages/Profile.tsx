import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'
import { getMe } from '../api/auth'
import { getKYCStatus } from '../api/kyc'
import { getVIP } from '../api/bonus'

interface KYC { level: number; status: string }
interface VIP { level: number; xp: number; nextXp: number; name: string }

export default function Profile() {
  const { t } = useTranslation()
  const { user, balance, setUser, token } = useAuthStore()
  const { addToast } = useUIStore()
  const [kyc, setKyc] = useState<KYC | null>(null)
  const [vip, setVip] = useState<VIP | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getMe().then((r) => {
        const u = r.data?.user || r.data
        if (u && token) setUser({ id: u.id, email: u.email, username: u.username, role: u.role || 'user' }, token)
      }).catch(() => {}),
      getKYCStatus().then((r) => setKyc(r.data)).catch(() => {}),
      getVIP().then((r) => setVip(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const vipPct = vip ? Math.round((vip.xp / vip.nextXp) * 100) : 0

  return (
    <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{t('profile.title')}</h1>

      {loading ? (
        <div style={{ color: '#444', fontSize: 13 }}>{t('common.loading')}</div>
      ) : (
        <div className="profile-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
          {/* Profile card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gold-dim)', border: '3px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'var(--gold)', margin: '0 auto 12px' }}>
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{user?.username || 'Player'}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{user?.email}</div>
              <div style={{ marginTop: 12, padding: '6px 14px', background: 'var(--gold-dim)', borderRadius: 20, display: 'inline-block', fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
                {vip ? vip.name || `VIP Level ${vip.level}` : 'VIP Level 0'}
              </div>
              {vip && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ background: '#111', borderRadius: 4, height: 5, marginBottom: 4 }}>
                    <div style={{ height: '100%', background: '#e4a832', borderRadius: 4, width: `${vipPct}%`, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#444' }}>{vip.xp.toLocaleString()} / {vip.nextXp.toLocaleString()} XP</div>
                </div>
              )}
            </div>

            {[
              [t('wallet.balance'), `$${balance.toFixed(2)}`, 'var(--gold)'],
              [t('profile.kyc'), kyc ? `Level ${kyc.level} · ${kyc.status}` : t('profile.notVerified'), kyc?.status === 'approved' ? 'var(--green)' : 'var(--text3)'],
              [t('profile.role'), user?.role || 'user', 'var(--text)'],
            ].map(([label, value, color]) => (
              <div key={label as string} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: color as string }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Settings */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>{t('profile.account')}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[t('auth.username'), t('auth.email')].map((label) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>{label}</label>
                  <input readOnly defaultValue={label === t('auth.username') ? user?.username : user?.email}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
                </div>
              ))}
              <button onClick={() => addToast('Contact support to update profile', 'success')}
                style={{ alignSelf: 'flex-start', padding: '10px 24px', borderRadius: 8, background: 'var(--gold)', color: '#000', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                {t('profile.saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 768px) {
          .profile-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
