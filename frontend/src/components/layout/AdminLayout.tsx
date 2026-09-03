import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/admin/players', label: 'Players', icon: '👥' },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: '💸' },
  { to: '/admin/kyc', label: 'KYC', icon: '🔍' },
  { to: '/admin/transactions', label: 'Transactions', icon: '📋' },
  { to: '/admin/bonuses', label: 'Bonuses', icon: '🎁' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

export default function AdminLayout() {
  const { logout, user } = useAuthStore()
  const location = useLocation()
  const nav = useNavigate()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f0f', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div style={{ width: 220, background: '#111', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>
            <span style={{ color: '#fff' }}>ROO</span><span style={{ color: '#e4a832' }}>BET</span>
            <span style={{ fontSize: 10, color: '#e4a832', marginLeft: 6, background: '#e4a83215', padding: '2px 6px', borderRadius: 4 }}>ADMIN</span>
          </div>
          <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{user?.email}</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {NAV.map(({ to, label, icon }) => {
            const active = to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(to)
            return (
              <Link key={to} to={to} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 2,
                background: active ? '#e4a83215' : 'transparent',
                color: active ? '#e4a832' : '#555',
                fontSize: 13, fontWeight: active ? 700 : 400,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 14 }}>{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>
        <div style={{ padding: '12px 8px', borderTop: '1px solid #1e1e1e' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, color: '#444', fontSize: 12 }}>
            ← Back to site
          </Link>
          <button onClick={() => { logout(); nav('/login') }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, color: '#444', fontSize: 12, background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
