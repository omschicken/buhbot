import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'
import { getBalance } from '../api/wallet'
import { login } from '../api/auth'
import RouletteBg from '../effects/RouletteBg'

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

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 7,
    padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none',
    transition: 'border-color 0.2s', boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161616', position: 'relative' }}>
      <RouletteBg />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#1a1a1a', border: '1px solid #272727', borderRadius: 14, padding: 28, width: '100%', maxWidth: 360, position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}><span>APEX</span><span style={{ color: '#e4a832' }}>GAME</span></div>
          <div style={{ fontSize: 12, color: '#555' }}>Sign in to your account</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>{t('auth.email')}</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={inputStyle} placeholder="you@example.com"
              onFocus={(e) => (e.target.style.borderColor = 'rgba(228,168,50,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = '#2a2a2a')} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>{t('auth.password')}</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required style={inputStyle} placeholder="••••••••"
              onFocus={(e) => (e.target.style.borderColor = 'rgba(228,168,50,0.5)')}
              onBlur={(e) => (e.target.style.borderColor = '#2a2a2a')} />
          </div>
          <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading}
            style={{ background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 13, padding: '11px', borderRadius: 8, border: 'none', width: '100%', marginTop: 4, opacity: loading ? 0.7 : 1 }}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </motion.button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#444' }}>
          {t('auth.noAccount')} <Link to="/register" style={{ color: '#e4a832' }}>{t('auth.signUp')}</Link>
        </div>
      </motion.div>
    </div>
  )
}
