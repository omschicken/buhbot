import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/authStore'
import ParticlesBg from '../components/ParticlesBg'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setToken, setUser } = useAuthStore()
  const nav = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await new Promise((r) => setTimeout(r, 800))
      setToken('mock-jwt-token')
      setUser({ id: '1', email, username: email.split('@')[0], kycStatus: 'approved', vipLevel: 3 })
      nav('/')
    } catch {
      setError('Invalid email or password')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-dark-900">
      <ParticlesBg />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.1),transparent)]" />
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-md mx-4"
      >
        <div className="glass rounded-2xl p-8 neon-border">
          <div className="text-center mb-8">
            <motion.div className="text-5xl mb-3" animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>🎰</motion.div>
            <h1 className="text-2xl font-bold gradient-text">Welcome back</h1>
            <p className="text-white/40 text-sm mt-1">Sign in to your account</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm mb-6">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
                className="w-full bg-dark-700 border border-white/5 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff88]/40 transition-colors placeholder:text-white/20"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-white/50 text-xs uppercase tracking-wider block mb-2">Password</label>
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required
                className="w-full bg-dark-700 border border-white/5 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-[#00ff88]/40 transition-colors placeholder:text-white/20"
                placeholder="••••••••" />
            </div>
            <motion.button
              type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full bg-[#00ff88] text-black font-bold py-3 rounded-xl glow-green transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <span className="inline-block animate-spin">⟳</span> : 'Sign In'}
            </motion.button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            No account? <Link to="/register" className="text-[#00ff88] hover:underline">Sign up</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
