import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '../../store/useAuthStore'
import { useJackpot, useOnlinePlayers } from '../../hooks/useLiveCounter'

export default function Navbar() {
  const { isAuthenticated, balance, logout, user } = useAuthStore()
  const jackpot = useJackpot()
  const online = useOnlinePlayers()
  const nav = useNavigate()
  const location = useLocation()

  const links = [
    { to: '/', label: 'Lobby' },
    { to: '/bonuses', label: 'Bonuses' },
    { to: '/affiliate', label: 'Affiliate' },
  ]

  return (
    <nav style={{
      background: 'rgba(17,17,17,0.95)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #222', position: 'sticky', top: 0, zIndex: 100,
      height: 54, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 24,
    }}>
      {/* Logo */}
      <Link to="/" style={{ fontWeight: 900, fontSize: 17, letterSpacing: -0.5, flexShrink: 0 }}>
        <span style={{ color: '#fff' }}>ROO</span><span style={{ color: '#e4a832' }}>BET</span>
      </Link>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {links.map((l) => {
          const active = location.pathname === l.to
          return (
            <Link key={l.to} to={l.to} style={{
              fontSize: 12, padding: '4px 12px', borderRadius: 6,
              color: active ? '#e4a832' : '#555',
              borderBottom: active ? '2px solid #e4a832' : '2px solid transparent',
              transition: 'color 0.2s',
            }}>{l.label}</Link>
          )
        })}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {/* Online */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#555' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 2s infinite' }} />
          {online.toLocaleString()}
        </div>

        {/* Jackpot */}
        <motion.div
          key={Math.floor(jackpot / 100)}
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 0.3 }}
          style={{ fontSize: 11, color: '#e4a832', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          JP ${jackpot.toLocaleString()}
        </motion.div>

        {isAuthenticated ? (
          <>
            {/* Balance */}
            <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 7, padding: '6px 14px', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              ${balance.toFixed(2)}
            </div>
            {/* Deposit */}
            <button onClick={() => nav('/wallet')} style={{
              background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 12,
              padding: '7px 16px', borderRadius: 7, border: 'none',
              animation: 'deposit-pulse 3s ease-in-out infinite',
              position: 'relative', overflow: 'hidden',
            }}>
              <span style={{ position: 'relative', zIndex: 1 }}>Deposit</span>
              <span style={{
                position: 'absolute', top: 0, left: '-100%', width: '40%', height: '100%',
                background: 'rgba(255,255,255,0.25)', transform: 'skewX(-20deg)',
                animation: 'shimmer 3s ease-in-out infinite',
              }} />
            </button>
            {/* Profile */}
            <Link to="/profile" style={{ width: 30, height: 30, borderRadius: '50%', background: '#e4a83220', border: '2px solid #e4a83260', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#e4a832' }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Link>
            <button onClick={() => { logout(); nav('/') }} style={{ fontSize: 11, color: '#444', background: 'none', border: 'none', padding: '4px 8px' }}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ fontSize: 12, color: '#888', padding: '6px 14px' }}>Login</Link>
            <Link to="/register" style={{ background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 12, padding: '7px 16px', borderRadius: 7 }}>Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  )
}
