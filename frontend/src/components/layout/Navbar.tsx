import { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/useAuthStore'
import { useJackpot, useOnlinePlayers } from '../../hooks/useLiveCounter'
import { getBalance } from '../../api/wallet'

const LANGS = [
  { code: 'en', flag: '🇬🇧', label: 'EN' },
  { code: 'ru', flag: '🇷🇺', label: 'RU' },
  { code: 'tr', flag: '🇹🇷', label: 'TR' },
  { code: 'pt', flag: '🇧🇷', label: 'PT' },
]

function LangSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current = LANGS.find((l) => l.code === i18n.language) || LANGS[0]

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen((v) => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 4, background: '#1e1e1e',
        border: '1px solid #2a2a2a', borderRadius: 6, padding: '5px 8px',
        color: '#aaa', fontSize: 11, fontWeight: 700, cursor: 'pointer',
      }}>
        {current.flag} {current.label} ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '110%', right: 0, background: '#1a1a1a',
          border: '1px solid #2a2a2a', borderRadius: 8, overflow: 'hidden', zIndex: 200, minWidth: 80,
        }}>
          {LANGS.map((l) => (
            <button key={l.code} onClick={() => { i18n.changeLanguage(l.code); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                padding: '8px 12px', background: i18n.language === l.code ? '#252525' : 'transparent',
                border: 'none', color: i18n.language === l.code ? '#e4a832' : '#888',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { t } = useTranslation()
  const { isAuthenticated, balance, setBalance, logout, user } = useAuthStore()
  const jackpot = useJackpot()
  const online = useOnlinePlayers()
  const nav = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isAuthenticated) return
    const fetch = () => getBalance().then((r) => setBalance(r.data?.balance ?? 0)).catch(() => {})
    fetch()
    const id = setInterval(fetch, 30000)
    return () => clearInterval(id)
  }, [isAuthenticated])

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/bonuses', label: t('nav.bonuses') },
    { to: '/affiliate', label: t('nav.affiliate') },
  ]

  return (
    <nav style={{
      background: 'rgba(17,17,17,0.95)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #222', position: 'sticky', top: 0, zIndex: 100,
      height: 54, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 24,
    }}>
      <Link to="/" style={{ fontWeight: 900, fontSize: 17, letterSpacing: -0.5, flexShrink: 0 }}>
        <span style={{ color: '#fff' }}>ROO</span><span style={{ color: '#e4a832' }}>BET</span>
      </Link>

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#555' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 2s infinite' }} />
          {online.toLocaleString()}
        </div>

        <motion.div
          key={Math.floor(jackpot / 100)}
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 0.3 }}
          style={{ fontSize: 11, color: '#e4a832', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
        >
          JP ${jackpot.toLocaleString()}
        </motion.div>

        <LangSwitcher />

        {isAuthenticated ? (
          <>
            <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 7, padding: '6px 14px', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              ${balance.toFixed(2)}
            </div>
            <button onClick={() => nav('/wallet')} style={{
              background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 12,
              padding: '7px 16px', borderRadius: 7, border: 'none',
              animation: 'deposit-pulse 3s ease-in-out infinite',
              position: 'relative', overflow: 'hidden',
            }}>
              <span style={{ position: 'relative', zIndex: 1 }}>{t('wallet.deposit')}</span>
              <span style={{
                position: 'absolute', top: 0, left: '-100%', width: '40%', height: '100%',
                background: 'rgba(255,255,255,0.25)', transform: 'skewX(-20deg)',
                animation: 'shimmer 3s ease-in-out infinite',
              }} />
            </button>
            <Link to="/profile" style={{ width: 30, height: 30, borderRadius: '50%', background: '#e4a83220', border: '2px solid #e4a83260', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#e4a832' }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </Link>
            <button onClick={() => { logout(); nav('/login') }} style={{ fontSize: 11, color: '#444', background: 'none', border: 'none', padding: '4px 8px' }}>
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ fontSize: 12, color: '#888', padding: '6px 14px' }}>{t('nav.login')}</Link>
            <Link to="/register" style={{ background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 12, padding: '7px 16px', borderRadius: 7 }}>{t('nav.register')}</Link>
          </>
        )}
      </div>
    </nav>
  )
}
