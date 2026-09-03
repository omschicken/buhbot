import { Link, useLocation } from 'react-router-dom'

const items = [
  { icon: '🏠', label: 'Lobby', to: '/' },
  { icon: '🎰', label: 'Slots', to: '/?cat=slots' },
  { icon: '📺', label: 'Live', to: '/?cat=live' },
  { icon: '🃏', label: 'Table', to: '/?cat=table' },
  null, // divider
  { icon: '💰', label: 'Wallet', to: '/wallet' },
  { icon: '🎁', label: 'Bonuses', to: '/bonuses' },
  { icon: '👤', label: 'Profile', to: '/profile' },
  null,
  { icon: '🤝', label: 'Affiliate', to: '/affiliate' },
]

export default function Sidebar() {
  const loc = useLocation()

  return (
    <aside style={{ width: 190, minHeight: '100%', background: '#1a1a1a', borderRight: '1px solid #222', paddingTop: 8, flexShrink: 0 }}>
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
            <span>{item.label}</span>
          </Link>
        )
      })}
    </aside>
  )
}
