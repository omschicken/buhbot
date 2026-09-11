import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/useAuthStore'
import { useOnlinePlayers } from '../../hooks/useLiveCounter'
import { getBalance } from '../../api/wallet'

const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'tr', label: 'TR' },
  { code: 'pt', label: 'PT' },
]

function LangSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = LANGS.find((l) => i18n.language.startsWith(l.code)) || LANGS[0]

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost btn-sm"
        style={{ gap: 4, padding: '6px 10px', minHeight: 32 }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{current.label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '110%', right: 0,
            background: 'var(--surface2)', border: '1px solid var(--border2)',
            borderRadius: 'var(--r-md)', overflow: 'hidden', zIndex: 200, minWidth: 90,
            boxShadow: 'var(--shadow)',
          }}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => { i18n.changeLanguage(l.code); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                  padding: '9px 14px',
                  background: current.code === l.code ? 'var(--blue-dim)' : 'transparent',
                  color: current.code === l.code ? 'var(--blue-bright)' : 'var(--text2)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
                  fontFamily: 'var(--font)',
                }}
              >
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Navbar() {
  const { t } = useTranslation()
  const { isAuthenticated, balance, setBalance, logout, user } = useAuthStore()
  const online = useOnlinePlayers()
  const nav = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) return
    const fetch = () => getBalance().then((r) => setBalance(r.data?.balance ?? 0)).catch(() => {})
    fetch()
    const id = setInterval(fetch, 30_000)
    return () => clearInterval(id)
  }, [isAuthenticated])

  return (
    <nav style={{
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky', top: 0, zIndex: 100,
      height: 56,
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 16,
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, textDecoration: 'none' }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'var(--blue-grad)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(26,86,219,0.5)',
          flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            <circle cx="7" cy="7" r="2" fill="white"/>
          </svg>
        </div>
        <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', letterSpacing: -0.3 }}>
          Apex<span style={{ color: 'var(--blue-bright)' }}>Game</span>
        </span>
      </Link>

      <div style={{ flex: 1 }} />

      {/* Online counter */}
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse-dot 2s infinite' }} />
        <span>{online.toLocaleString()}</span>
      </div>

      <LangSwitcher />

      {isAuthenticated ? (
        <>
          {/* Balance */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--surface)', border: '1px solid var(--border2)',
            borderRadius: 'var(--r)', padding: '5px 12px',
            fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
            color: 'var(--text)',
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="var(--blue-bright)" strokeWidth="1.3"/>
              <path d="M6 3v6M4 5h3a1 1 0 010 2H4" stroke="var(--blue-bright)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            ${balance.toFixed(2)}
          </div>

          {/* Deposit */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => nav('/wallet')}
            style={{ position: 'relative', overflow: 'hidden', minHeight: 32 }}
          >
            <span style={{ position: 'relative', zIndex: 1 }}>{t('wallet.deposit')}</span>
            <span style={{
              position: 'absolute', top: 0, left: '-100%', width: '40%', height: '100%',
              background: 'rgba(255,255,255,0.15)', transform: 'skewX(-20deg)',
              animation: 'shimmer 3s ease-in-out infinite',
            }} />
          </button>

          {/* Avatar */}
          <Link className="hide-mobile" to="/profile" style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--blue-dim)',
            border: '1px solid var(--blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 800, color: 'var(--blue-bright)',
            flexShrink: 0,
          }}>
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </Link>

          <button
            className="hide-mobile"
            onClick={() => { logout(); nav('/login') }}
            style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 8px' }}
          >
            {t('nav.logout')}
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="btn btn-ghost btn-sm">{t('nav.login')}</Link>
          <Link to="/register" className="btn btn-primary btn-sm">{t('nav.register')}</Link>
        </>
      )}
    </nav>
  )
}
