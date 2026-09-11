import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'
import { getBalance } from '../api/wallet'
import { login } from '../api/auth'

export default function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser, setBalance } = useAuthStore()
  const { addToast } = useUIStore()
  const nav = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { addToast('Fill in all fields', 'error'); return }
    setLoading(true)
    try {
      const res = await login(email, password)
      const { token, user } = res.data
      setUser({ id: user.id, email: user.email, username: user.username, role: user.role || 'user' }, token)
      try {
        const balRes = await getBalance()
        setBalance(balRes.data?.balance ?? 0)
      } catch { setBalance(0) }
      addToast(t('auth.welcome'), 'success')
      nav('/')
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || t('auth.invalidCredentials')
      addToast(msg, 'error')
    } finally { setLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(26,86,219,0.08) 0%, transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none',
      }} />

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)', padding: '32px 28px',
        width: '100%', maxWidth: 360, position: 'relative', zIndex: 2,
        boxShadow: 'var(--shadow-lg)',
        animation: 'fade-in 0.2s ease',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--blue-grad)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(26,86,219,0.5)',
            }}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <circle cx="7" cy="7" r="2" fill="white"/>
              </svg>
            </div>
            <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', letterSpacing: -0.3 }}>
              Apex<span style={{ color: 'var(--blue-bright)' }}>Game</span>
            </span>
          </Link>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t('auth.signInDesc') || 'Sign in to your account'}</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              {t('auth.email')}
            </label>
            <input
              value={email} onChange={(e) => setEmail(e.target.value)}
              type="email" required className="input" style={{ width: '100%' }}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', display: 'block', marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              {t('auth.password')}
            </label>
            <input
              value={password} onChange={(e) => setPassword(e.target.value)}
              type="password" required className="input" style={{ width: '100%' }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 4, opacity: loading ? 0.7 : 1, position: 'relative', overflow: 'hidden' }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>
              {loading ? (t('auth.signingIn') || 'Signing in…') : (t('auth.signIn') || 'Sign In')}
            </span>
            {!loading && (
              <span style={{
                position: 'absolute', top: 0, left: '-100%', width: '40%', height: '100%',
                background: 'rgba(255,255,255,0.12)', transform: 'skewX(-20deg)',
                animation: 'shimmer 3s ease-in-out infinite',
              }} />
            )}
          </button>
        </form>

        <div style={{ height: 1, background: 'var(--border)', margin: '20px 0' }} />
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)' }}>
          {t('auth.noAccount') || "Don't have an account?"}{' '}
          <Link to="/register" style={{ color: 'var(--blue-bright)', fontWeight: 600 }}>
            {t('auth.signUp') || 'Sign up'}
          </Link>
        </div>
      </div>
    </div>
  )
}
