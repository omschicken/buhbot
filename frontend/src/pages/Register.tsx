import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'
import { register } from '../api/auth'
import { getBalance } from '../api/wallet'
import RouletteBg from '../effects/RouletteBg'

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const { setUser, setBalance } = useAuthStore()
  const { addToast } = useUIStore()
  const nav = useNavigate()
  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirm) { addToast('Passwords do not match', 'error'); return }
    if (form.password.length < 6) { addToast('Password must be at least 6 characters', 'error'); return }
    setLoading(true)
    try {
      const res = await register(form.email, form.username, form.password)
      const { token, user } = res.data
      setUser({ id: user.id, email: user.email, username: user.username, role: user.role || 'user' }, token)
      try {
        const balRes = await getBalance()
        setBalance(balRes.data?.balance ?? 0)
      } catch { setBalance(0) }
      addToast('Account created!', 'success')
      nav('/')
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Registration failed'
      addToast(msg, 'error')
    } finally { setLoading(false) }
  }

  const inputStyle: React.CSSProperties = { width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#161616', position: 'relative' }}>
      <RouletteBg />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: '#1a1a1a', border: '1px solid #272727', borderRadius: 14, padding: 28, width: '100%', maxWidth: 360, position: 'relative', zIndex: 2 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}><span>ROO</span><span style={{ color: '#e4a832' }}>BET</span></div>
          <div style={{ fontSize: 12, color: '#555' }}>Create your account</div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { k: 'email', label: 'Email', type: 'email', ph: 'you@example.com' },
            { k: 'username', label: 'Username', type: 'text', ph: 'coolplayer99' },
            { k: 'password', label: 'Password', type: 'password', ph: '••••••••' },
            { k: 'confirm', label: 'Confirm Password', type: 'password', ph: '••••••••' },
          ].map(({ k, label, type, ph }) => (
            <div key={k}>
              <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 5 }}>{label}</label>
              <input value={form[k as keyof typeof form]} onChange={setField(k)} type={type} required style={inputStyle} placeholder={ph}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(228,168,50,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = '#2a2a2a')} />
            </div>
          ))}
          <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading}
            style={{ background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 13, padding: 11, borderRadius: 8, border: 'none', width: '100%', marginTop: 4, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating account...' : 'Create Account'}
          </motion.button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 12, color: '#444' }}>
          Have an account? <Link to="/login" style={{ color: '#e4a832' }}>Sign in</Link>
        </div>
      </motion.div>
    </div>
  )
}
