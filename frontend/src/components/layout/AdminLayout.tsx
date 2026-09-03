import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: '\u{1F4CA}' },
  { to: '/admin/players', label: 'Players', icon: '\u{1F465}' },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: '\u{1F4B8}' },
  { to: '/admin/kyc', label: 'KYC', icon: '\u{1F50D}' },
  { to: '/admin/transactions', label: 'Transactions', icon: '\u{1F4CB}' },
  { to: '/admin/bonuses', label: 'Bonuses', icon: '\u{1F381}' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

export default function AdminLayout() {
  const { logout, user } = useAuthStore()
  const location = useLocation()
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const sidebar = (
    <>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #1e1e1e' }}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>
          <span style={{ color: '#fff' }}>APEX</span><span style={{ color: '#e4a832' }}>GAME</span>
          <span style={{ fontSize: 10, color: '#e4a832', marginLeft: 6, background: '#e4a83215', padding: '2px 6px', borderRadius: 4 }}>ADMIN</span>
        </div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>{user?.email}</div>
      </div>
      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {NAV.map(({ to, label, icon }) => {
          const active = to === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(to)
          return (
            <Link key={to} to={to} onClick={() => setMenuOpen(false)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              background: active ? '#e4a83215' : 'transparent',
              color: active ? '#e4a832' : '#555',
              fontSize: 13, fontWeight: active ? 700 : 400,
              transition: 'all 0.15s', minHeight: 44,
            }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '12px 8px', borderTop: '1px solid #1e1e1e' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, color: '#444', fontSize: 12, minHeight: 44 }}>
          ← Back to site
        </Link>
        <button onClick={() => { logout(); nav('/login') }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, color: '#444', fontSize: 12, background: 'none', border: 'none', width: '100%', cursor: 'pointer', minHeight: 44 }}>
          Logout
        </button>
      </div>
    </>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f0f0f', fontFamily: 'system-ui, sans-serif' }}>
      {/* Desktop sidebar */}
      <div className="admin-sidebar" style={{ width: 220, background: '#111', borderRight: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {sidebar}
      </div>

      {/* Mobile header + drawer */}
      <div className="admin-mobile-header mobile-only" style={{
        display: 'none', position: 'fixed', top: 0, left: 0, right: 0, height: 48,
        background: '#111', borderBottom: '1px solid #1e1e1e', zIndex: 200,
        alignItems: 'center', padding: '0 12px', gap: 12,
      }}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ fontSize: 20, color: '#e4a832', background: 'none', border: 'none', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {menuOpen ? '✕' : '☰'}
        </button>
        <span style={{ fontWeight: 900, fontSize: 14 }}>
          <span style={{ color: '#fff' }}>APEX</span><span style={{ color: '#e4a832' }}>GAME</span>
          <span style={{ fontSize: 9, color: '#e4a832', marginLeft: 4 }}>ADMIN</span>
        </span>
      </div>

      {menuOpen && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 201 }} />
          <div style={{
            position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: '#111',
            zIndex: 202, display: 'flex', flexDirection: 'column', overflowY: 'auto',
          }}>
            {sidebar}
          </div>
        </>
      )}

      {/* Content */}
      <div className="admin-content" style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
          <Outlet />
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar { display: none !important; }
          .admin-content { padding-top: 48px !important; }
          .admin-content > div { padding: 12px !important; }
        }
      `}</style>
    </div>
  )
}
