import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import ParticlesBg from '../components/ParticlesBg'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setToken, setUser } = useAuthStore()
  const nav = useNavigate()
  const setField = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 800))
      setToken('mock-jwt-token')
      setUser({ id: '1', email: form.email, username: form.username, kycStatus: 'pending', vipLevel: 1 })
      nav('/')
    } catch { setError('Registration failed') } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-dark-900 py-8">
      <ParticlesBg />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md mx-4">
        <div className="glass rounded-2xl p-8 neon-border">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🚀</div>
            <h1 className="text-2xl font-bold gradient-text">Create account</h1>
            <p className="text-white/40 text-sm mt-1">Join thousands of winners</p>
          </div>
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-6">{error}</motion.div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { key: 'username', label: 'Username', type: 'text', placeholder: 'coolplayer99' },
              { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
              { key: 'confirm', label: 'Confirm Password', type: 'password', placeholder: '••••••••' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">{label}</label>
                <input value={form[key as keyof typeof form]} onChange={setField(key)} type={type} required
                  className="w-full bg-dark-700 border border-white/5 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff88]/40 transition-colors placeholder:text-white/20"
                  placeholder={placeholder} />
              </div>
            ))}
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading}
              className="w-full bg-gradient-to-r from-[#00ff88] to-[#7c3aed] text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50">
              {loading ? '⟳' : 'Create Account'}
            </motion.button>
          </form>
          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account? <Link to="/login" className="text-[#00ff88] hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
