import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useOnlinePlayers, usePaidToday } from '../hooks/useLiveCounter'

const CATEGORIES = [
  { id: 'All',       label: 'All Games' },
  { id: 'Originals', label: 'Originals' },
  { id: 'Slots',     label: 'Slots' },
  { id: 'Live',      label: 'Live Casino' },
  { id: 'Table',     label: 'Table' },
  { id: 'Crash',     label: 'Crash' },
]

const GAME_COLORS: Record<string, string> = {
  crash:    'linear-gradient(135deg, #0d1f4a 0%, #1a2d6b 100%)',
  baccarat: 'linear-gradient(135deg, #0f2218 0%, #14391f 100%)',
  plinko:   'linear-gradient(135deg, #1a1040 0%, #2d1a5e 100%)',
  mines:    'linear-gradient(135deg, #1a0d0d 0%, #3a1515 100%)',
  rugpull:  'linear-gradient(135deg, #0d1a1a 0%, #0f2d2a 100%)',
  default:  'linear-gradient(135deg, #131820 0%, #1c2330 100%)',
}

const GAMES = [
  { id: 'crash',    name: 'Crash',         provider: 'Originals', category: 'Originals', rtp: 99,   hot: true,  internal: true, path: '/games/crash',    icon: '🚀' },
  { id: 'mines',    name: 'Mines',         provider: 'Originals', category: 'Originals', rtp: 99,   hot: true,  internal: true, path: '/games/mines',    icon: '💎' },
  { id: 'plinko',   name: 'Plinko',        provider: 'Originals', category: 'Originals', rtp: 97,   hot: true,  internal: true, path: '/games/plinko',   icon: '🔵' },
  { id: 'rugpull',  name: 'Rug Pull',      provider: 'Originals', category: 'Originals', rtp: 95,   hot: true,  internal: true, path: '/games/rugpull',  icon: '🪝' },
  { id: 'baccarat', name: 'Baccarat',      provider: 'Originals', category: 'Originals', rtp: 98.9, hot: false, internal: true, path: '/games/baccarat', icon: '🃏' },
  { id: 'aviator',  name: 'Aviator',       provider: 'Spribe',    category: 'Crash',     rtp: 97,   hot: true,  internal: false, icon: '✈️' },
  { id: 'sweet',    name: 'Sweet Bonanza', provider: 'Pragmatic', category: 'Slots',     rtp: 96.5, hot: true,  internal: false, icon: '🍭' },
  { id: 'light-r',  name: 'Lightning Roulette', provider: 'Evolution', category: 'Live', rtp: 97.3, hot: false, internal: false, icon: '⚡' },
  { id: 'olympus',  name: 'Gates of Olympus', provider: 'Pragmatic', category: 'Slots', rtp: 96.5, hot: true,  internal: false, icon: '⚡' },
  { id: 'bj-vip',   name: 'Blackjack VIP', provider: 'Evolution', category: 'Live',    rtp: 99.5, hot: false, internal: false, icon: '🃏' },
  { id: 'bod',      name: 'Book of Dead',  provider: "Play'n GO", category: 'Slots',   rtp: 96.2, hot: false, internal: false, icon: '📖' },
  { id: 'ctime',    name: 'Crazy Time',    provider: 'Evolution', category: 'Live',    rtp: 96.1, hot: true,  internal: false, icon: '🎡' },
  { id: 'star',     name: 'Starburst',     provider: 'NetEnt',    category: 'Slots',   rtp: 96.1, hot: false, internal: false, icon: '⭐' },
  { id: 'teen',     name: 'Teen Patti',    provider: 'Ezugi',     category: 'Table',   rtp: 97.0, hot: false, internal: false, icon: '🎴' },
  { id: 'jetx',     name: 'JetX',          provider: 'SmartSoft', category: 'Crash',   rtp: 97.0, hot: true,  internal: false, icon: '🚀' },
  { id: 'mega',     name: 'Mega Ball',     provider: 'Evolution', category: 'Live',    rtp: 95.4, hot: false, internal: false, icon: '🎱' },
]

const TICKER = '🏆 CryptoWolf выиграл $1,240 · MoonBet выиграл $890 · DarkKnight выиграл $3,200 · GoldRush выиграл $540 · StarPlayer выиграл $2,100 · '

export default function Home() {
  const { t } = useTranslation()
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const paid = usePaidToday()
  const online = useOnlinePlayers()

  const filtered = GAMES.filter((g) =>
    (cat === 'All' || g.category === cat) &&
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fade-in 0.25s ease' }}>

      {/* ── Winners ticker ── */}
      <div style={{
        background: 'var(--bg3)',
        borderBottom: '1px solid var(--border)',
        height: 30, overflow: 'hidden',
        display: 'flex', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'marquee 30s linear infinite' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{TICKER.repeat(4)}</span>
        </div>
      </div>

      {/* ── Hero stats ── */}
      <div className="hero-stats" style={{
        background: 'linear-gradient(180deg, var(--bg3) 0%, var(--bg) 100%)',
        padding: '20px 24px',
        display: 'flex', gap: 1,
        borderBottom: '1px solid var(--border)',
      }}>
        {[
          {
            label: t('home.paidToday') || 'Paid Today',
            value: '$' + paid.toLocaleString('en-US', { minimumFractionDigits: 0 }),
            icon: (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="var(--blue-bright)" strokeWidth="1.3"/>
                <path d="M7 3.5v7M5 5.5h3a1.5 1.5 0 010 3H5" stroke="var(--blue-bright)" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            ),
            color: 'var(--text)',
          },
          {
            label: t('home.onlineNow') || 'Online Now',
            value: online.toLocaleString(),
            icon: (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="2" fill="var(--green)"/>
                <circle cx="7" cy="7" r="5.5" stroke="var(--green)" strokeWidth="1.3" opacity=".4"/>
              </svg>
            ),
            color: 'var(--green)',
          },
        ].map(({ label, value, icon, color }) => (
          <div key={label} style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 20px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            marginRight: 8,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 'var(--r)',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {icon}
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: -0.5 }}>{value}</div>
            </div>
          </div>
        ))}
        {/* Blue accent block */}
        <div style={{
          flex: 1.5, padding: '12px 20px',
          background: 'var(--blue-grad-soft)',
          border: '1px solid rgba(26,86,219,0.25)',
          borderRadius: 'var(--r-lg)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 10, color: 'rgba(147,197,253,0.6)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
            Provably Fair · Instant Withdrawals
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue-bright)' }}>
            Cryptographically verified games
          </div>
        </div>
      </div>

      {/* ── Search + categories ── */}
      <div className="filter-bar" style={{
        padding: '14px 24px',
        display: 'flex', gap: 10, alignItems: 'center',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="var(--text3)" strokeWidth="1.3"/>
            <path d="M9.5 9.5l2.5 2.5" stroke="var(--text3)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('home.searchGames') || 'Search games...'}
            style={{ paddingLeft: 30, width: 200, minHeight: 36 }}
          />
        </div>
        <div className="cat-buttons" style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              style={{
                padding: '7px 14px', borderRadius: 'var(--r)', fontSize: 12, fontWeight: 600,
                background: cat === c.id ? 'var(--blue-dim)' : 'var(--surface)',
                color: cat === c.id ? 'var(--blue-bright)' : 'var(--text2)',
                border: `1px solid ${cat === c.id ? 'var(--blue)' : 'var(--border)'}`,
                transition: 'all 0.12s', whiteSpace: 'nowrap', minHeight: 36, flexShrink: 0,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}
            >{c.label}</button>
          ))}
        </div>
      </div>

      {/* ── Games grid ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px 32px' }} className="games-scroll">
        {cat === 'All' && search === '' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>
              ⚡ Originals
            </div>
            <div className="originals-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }}>
              {GAMES.filter((g) => g.category === 'Originals').map((game) => (
                <GameCard key={game.id} game={game} navigate={navigate} featured />
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text3)', marginBottom: 12 }}>
              🔥 Popular
            </div>
          </div>
        )}

        <div className="games-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {filtered.map((game) => (
            <GameCard key={game.id} game={game} navigate={navigate} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
            <svg style={{ marginBottom: 12, opacity: 0.3 }} width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="18" cy="18" r="12" stroke="currentColor" strokeWidth="2"/>
              <path d="M26 26l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <div style={{ fontSize: 14, fontWeight: 500 }}>No games found</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Try a different search or category</div>
          </div>
        )}
      </div>

      <style>{`
        .gcard:hover .play-overlay { opacity: 1 !important; }
        @media (hover: none) {
          .gcard .play-overlay { opacity: 1 !important; background: rgba(0,0,0,0.35) !important; }
        }
        @media (max-width: 768px) {
          .hero-stats { padding: 12px !important; gap: 8px !important; flex-direction: column !important; }
          .filter-bar { padding: 12px !important; flex-direction: column !important; align-items: flex-start !important; }
          .filter-bar input { width: 100% !important; }
          .cat-buttons { width: 100%; }
          .games-scroll { padding: 12px !important; }
          .originals-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .games-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
        }
        @media (max-width: 480px) {
          .games-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}

function GameCard({ game, navigate, featured }: { game: any; navigate: any; featured?: boolean }) {
  const bg = GAME_COLORS[game.id] || GAME_COLORS.default

  return (
    <div
      className="gcard"
      onClick={() => game.internal ? navigate(game.path || '/') : navigate(`/game/${game.id}`)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--blue)'
        el.style.transform = 'translateY(-2px)'
        el.style.boxShadow = 'var(--shadow-blue)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement
        el.style.borderColor = 'var(--border)'
        el.style.transform = 'none'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Image area */}
      <div style={{
        height: featured ? 110 : 90,
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: featured ? 44 : 36,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle grid overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        {/* Glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 120%, rgba(26,86,219,0.15) 0%, transparent 70%)',
        }} />
        <span style={{ position: 'relative', zIndex: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>
          {game.icon}
        </span>

        {/* Badges */}
        {game.hot && (
          <div className="badge badge-hot" style={{ position: 'absolute', top: 8, right: 8 }}>HOT</div>
        )}
        {game.internal && (
          <div className="badge badge-blue" style={{ position: 'absolute', top: 8, left: 8 }}>ORIG</div>
        )}

        {/* Play overlay */}
        <div className="play-overlay" style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.15s',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--blue-grad)',
            padding: '7px 16px', borderRadius: 'var(--r)',
            fontSize: 12, fontWeight: 700, color: '#fff',
            boxShadow: '0 2px 12px rgba(26,86,219,0.5)',
          }}>
            <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
              <path d="M1 1l8 5-8 5V1z"/>
            </svg>
            Play
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '9px 11px' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {game.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--text3)' }}>{game.provider}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontVariantNumeric: 'tabular-nums' }}>{game.rtp}%</span>
        </div>
      </div>
    </div>
  )
}
