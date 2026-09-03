import { Link, useLocation } from 'react-router-dom'

const TABS = [
  { icon: '\u{1F3E0}', label: 'Home', to: '/' },
  { icon: '\u{1F3B0}', label: 'Games', to: '/?category=slots' },
  { icon: '\u{1F4B3}', label: 'Wallet', to: '/wallet' },
  { icon: '\u{1F381}', label: 'Bonuses', to: '/bonuses' },
  { icon: '\u{1F464}', label: 'Profile', to: '/profile' },
]

export default function BottomTabBar() {
  const loc = useLocation()

  return (
    <nav className="mobile-only" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 60,
      background: '#1a1a1a', borderTop: '1px solid #222', zIndex: 100,
      display: 'none', gridTemplateColumns: 'repeat(5, 1fr)',
      paddingBottom: 'env(safe-area-inset-bottom, 0)',
    }}>
      {TABS.map((tab) => {
        const active = tab.to === '/'
          ? loc.pathname === '/' && !loc.search
          : loc.pathname === tab.to || (tab.to.includes('?') && loc.pathname === '/' && loc.search.includes('category'))
        return (
          <Link key={tab.to} to={tab.to} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, color: active ? '#e4a832' : '#555', transition: 'color 0.15s',
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.icon}</span>
            <span style={{ fontSize: 9, fontWeight: 600 }}>{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
