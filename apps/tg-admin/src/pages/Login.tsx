import { useState } from 'react'
import WebApp from '@twa-dev/sdk'
import { login } from '../api'

export default function LoginPage({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) return
    setLoading(true)
    try {
      const res = await login(email, password)
      const token = res.data.token
      if (!token) throw new Error('No token')
      onLogin(token)
    } catch {
      WebApp.showAlert('❌ Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>🎰</div>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>APEXGAME Admin</h1>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 24 }}>Telegram Mini App</p>

      <div style={{ width: '100%', maxWidth: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input className="search-input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="search-input" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
        <button className="btn btn-gold" onClick={handleLogin} disabled={loading}
          style={{ width: '100%', padding: 12, fontSize: 14, opacity: loading ? 0.5 : 1 }}>
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </div>
    </div>
  )
}
