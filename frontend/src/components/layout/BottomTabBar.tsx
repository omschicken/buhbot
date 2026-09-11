import { Link, useLocation } from 'react-router-dom'

const IconHome = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <path d="M2 6.5L8 2l6 4.5V14H10v-3.5H6V14H2V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
)
const IconSlots = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <line x1="5.5" y1="3.5" x2="5.5" y2="12.5" stroke="currentColor" strokeWidth="1.4"/>
    <line x1="10.5" y1="3.5" x2="10.5" y2="12.5" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="3.5" cy="8" r="1" fill="currentColor"/>
    <circle cx="8" cy="8" r="1" fill="currentColor"/>
    <circle cx="12.5" cy="8" r="1" fill="currentColor"/>
  </svg>
)
const IconWallet = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="4.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1.5 7.5h13" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10.5 2.5l-9 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="11.5" cy="10" r="1" fill="currentColor"/>
  </svg>
)
const IconGift = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="6.5" width="13" height="8" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="3" y="4" width="10" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 4V14.5" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
)
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const TABS = [
  { icon: <IconHome />,   label: 'Home',    to: '/' },
  { icon: <IconSlots />,  label: 'Games',   to: '/?cat=slots' },
  { icon: <IconWallet />, label: 'Wallet',  to: '/wallet' },
  { icon: <IconGift />,   label: 'Bonuses', to: '/bonuses' },
  { icon: <IconUser />,   label: 'Profile', to: '/profile' },
]

export default function BottomTabBar() {
  const loc = useLocation()

  return (
    <>
      <nav className="bottom-tab-bar" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 60, background: 'var(--bg2)', borderTop: '1px solid var(--border)',
        zIndex: 100, display: 'none', gridTemplateColumns: 'repeat(5, 1fr)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
      }}>
        {TABS.map((tab) => {
          const active = tab.to === '/'
            ? loc.pathname === '/' && !loc.search
            : loc.pathname === tab.to || (tab.to.includes('?') && loc.pathname === '/' && loc.search.includes('cat'))
          return (
            <Link key={tab.to} to={tab.to} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, color: active ? 'var(--blue-bright)' : 'var(--text3)',
              transition: 'color 0.15s', textDecoration: 'none',
            }}>
              {tab.icon}
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.3 }}>{tab.label}</span>
              {active && (
                <div style={{
                  position: 'absolute', bottom: 0, width: 24, height: 2,
                  background: 'var(--blue)', borderRadius: 1,
                }} />
              )}
            </Link>
          )
        })}
      </nav>
      <style>{`
        @media (max-width: 768px) {
          .bottom-tab-bar { display: grid !important; }
        }
      `}</style>
    </>
  )
}
