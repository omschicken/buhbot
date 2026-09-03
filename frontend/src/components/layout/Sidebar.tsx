import { Link, useLocation } from 'react-router-dom'

const items = [
  { icon: '\u{1F3E0}', label: 'Lobby', to: '/' },
  { icon: '\u{1F3B0}', label: 'Slots', to: '/?cat=slots' },
  { icon: '\u{1F4FA}', label: 'Live', to: '/?cat=live' },
  { icon: '\u{1F0CF}', label: 'Table', to: '/?cat=table' },
  null,
  { icon: '\u{1F4B0}', label: 'Wallet', to: '/wallet' },
  { icon: '\u{1F381}', label: 'Bonuses', to: '/bonuses' },
  { icon: '\u{1F464}', label: 'Profile', to: '/profile' },
  null,
  { icon: '\u{1F91D}', label: 'Affiliate', to: '/affiliate' },
]

export default function Sidebar() {
  const loc = useLocation()

  return (
    <>
      <aside className="sidebar-desktop" style={{ width: 190, minHeight: '100%', background: '#1a1a1a', borderRight: '1px solid #222', paddingTop: 8, flexShrink: 0 }}>
        {items.map((item, i) => {
          if (!item) return <div key={i} style={{ height: 1, background: '#222', margin: '6px 14px' }} />
          const active = loc.pathname === item.to || (item.to.startsWith('/?') && loc.pathname === '/')
          return (
            <Link key={item.to + i} to={item.to} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 16px', fontSize: 12,
              color: active ? '#e4a832' : '#555',
              borderLeft: `3px solid ${active ? '#e4a832' : 'transparent'}`,
              background: active ? '#e4a83210' : 'transparent',
              transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          )
        })}
      </aside>
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar-desktop { width: 56px !important; }
          .sidebar-label { display: none !important; }
        }
      `}</style>
    </>
  )
}
