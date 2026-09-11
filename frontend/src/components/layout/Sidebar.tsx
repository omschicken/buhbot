import { Link, useLocation } from 'react-router-dom'

const IconHome = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 6.5L8 2l6 4.5V14H10v-3.5H6V14H2V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
)
const IconSlots = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <line x1="5.5" y1="3.5" x2="5.5" y2="12.5" stroke="currentColor" strokeWidth="1.4"/>
    <line x1="10.5" y1="3.5" x2="10.5" y2="12.5" stroke="currentColor" strokeWidth="1.4"/>
    <circle cx="3.5" cy="8" r="1" fill="currentColor"/>
    <circle cx="8" cy="8" r="1" fill="currentColor"/>
    <circle cx="12.5" cy="8" r="1" fill="currentColor"/>
  </svg>
)
const IconLive = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="2" fill="currentColor"/>
    <path d="M4.5 4.5a5 5 0 017 7M4.5 11.5a5 5 0 010-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <path d="M2 2a9 9 0 0112 12M2 14A9 9 0 0114 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity=".45"/>
  </svg>
)
const IconTable = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="5.5" width="13" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5 5.5V4a1 1 0 011-1h4a1 1 0 011 1v1.5" stroke="currentColor" strokeWidth="1.4"/>
    <line x1="8" y1="5.5" x2="8" y2="12.5" stroke="currentColor" strokeWidth="1.4"/>
  </svg>
)
const IconWallet = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="4.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M1.5 7.5h13" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10.5 2.5l-9 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="11.5" cy="10" r="1" fill="currentColor"/>
  </svg>
)
const IconGift = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1.5" y="6.5" width="13" height="8" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <rect x="3" y="4" width="10" height="2.5" rx="1" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 4V14.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M8 4c0 0-2.5-3 0-3s0 3 0 3z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    <path d="M8 4c0 0 2.5-3 0-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="3" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)
const IconHandshake = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M1 9l3-3h3l2-2h3l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6 12l2-2 4 2 3-3-4-3-3 2H3L1 9l2 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
  </svg>
)

const NAV_SECTIONS = [
  {
    label: 'Casino',
    items: [
      { icon: <IconHome />, label: 'Lobby',    to: '/' },
      { icon: <IconSlots />, label: 'Slots',   to: '/?cat=slots' },
      { icon: <IconLive />, label: 'Live',     to: '/?cat=live' },
      { icon: <IconTable />, label: 'Table',   to: '/?cat=table' },
    ],
  },
  {
    label: 'Account',
    items: [
      { icon: <IconWallet />,    label: 'Wallet',    to: '/wallet' },
      { icon: <IconGift />,      label: 'Bonuses',   to: '/bonuses' },
      { icon: <IconUser />,      label: 'Profile',   to: '/profile' },
      { icon: <IconHandshake />, label: 'Affiliate', to: '/affiliate' },
    ],
  },
]

export default function Sidebar() {
  const loc = useLocation()

  return (
    <>
      <aside className="sidebar-desktop" style={{
        width: 200,
        minHeight: '100%',
        background: 'var(--bg2)',
        borderRight: '1px solid var(--border)',
        paddingTop: 12,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}>
        {NAV_SECTIONS.map((section, si) => (
          <div key={si} style={{ marginBottom: 8 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--text3)',
              padding: '6px 18px 4px',
            }}>
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = loc.pathname === item.to || (item.to.startsWith('/?') && loc.pathname === '/')
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 18px',
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    color: active ? 'var(--text)' : 'var(--text2)',
                    background: active ? 'var(--blue-dim)' : 'transparent',
                    borderLeft: `2px solid ${active ? 'var(--blue)' : 'transparent'}`,
                    transition: 'all 0.12s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--surface)'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLElement).style.color = 'var(--text2)'
                    }
                  }}
                >
                  <span style={{ color: active ? 'var(--blue-bright)' : 'var(--text3)', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  <span className="sidebar-label">{item.label}</span>
                </Link>
              )
            })}
            {si < NAV_SECTIONS.length - 1 && (
              <div style={{ height: 1, background: 'var(--border)', margin: '8px 14px' }} />
            )}
          </div>
        ))}
      </aside>
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .sidebar-desktop { width: 52px !important; }
          .sidebar-label { display: none !important; }
        }
      `}</style>
    </>
  )
}
