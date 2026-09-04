import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useJackpot, usePaidToday, useOnlinePlayers } from '../hooks/useLiveCounter'

const CATEGORIES = ['All', 'Originals', 'Slots', 'Live', 'Table', 'Crash', 'New']

const GAMES = [
  { id: 'crash', name: 'Crash', provider: 'APEXGAME Originals', category: 'Originals', rtp: 99, hot: true, img: '🚀', internal: true, path: '/games/crash' },
  { id: 'baccarat', name: 'Baccarat', provider: 'APEXGAME Originals', category: 'Originals', rtp: 98.9, hot: true, img: '🎴', internal: true, path: '/games/baccarat' },
  { id: 1, name: 'Aviator', provider: 'Spribe', category: 'Crash', rtp: 97, hot: true, img: '✈️' },
  { id: 2, name: 'Sweet Bonanza', provider: 'Pragmatic', category: 'Slots', rtp: 96.5, hot: true, img: '\u{1F36C}' },
  { id: 3, name: 'Lightning Roulette', provider: 'Evolution', category: 'Live', rtp: 97.3, hot: false, img: '⚡' },
  { id: 4, name: 'Gates of Olympus', provider: 'Pragmatic', category: 'Slots', rtp: 96.5, hot: true, img: '⚡' },
  { id: 5, name: 'Blackjack VIP', provider: 'Evolution', category: 'Live', rtp: 99.5, hot: false, img: '\u{1F0CF}' },
  { id: 6, name: 'Book of Dead', provider: "Play'n GO", category: 'Slots', rtp: 96.2, hot: false, img: '\u{1F4D6}' },
  { id: 7, name: 'Crazy Time', provider: 'Evolution', category: 'Live', rtp: 96.1, hot: true, img: '\u{1F3A1}' },
  { id: 8, name: 'Starburst', provider: 'NetEnt', category: 'Slots', rtp: 96.1, hot: false, img: '⭐' },
  { id: 9, name: 'Teen Patti', provider: 'Ezugi', category: 'Table', rtp: 97.0, hot: false, img: '\u{1F3B4}' },
  { id: 10, name: 'JetX', provider: 'SmartSoft', category: 'Crash', rtp: 97.0, hot: true, img: '\u{1F680}' },
  { id: 11, name: 'Mega Ball', provider: 'Evolution', category: 'Live', rtp: 95.4, hot: false, img: '\u{1F3B1}' },
  { id: 12, name: 'Wolf Gold', provider: 'Pragmatic', category: 'Slots', rtp: 96.0, hot: false, img: '\u{1F43A}' },
]

const WINNERS_TEXT = '\u{1F3C6} CryptoWolf won $1,240 · MoonBet won $890 · DarkKnight won $3,200 · GoldRush won $540 · StarPlayer won $2,100 · '

export default function Home() {
  const { t } = useTranslation()
  const [cat, setCat] = useState('All')
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const jackpot = useJackpot()
  const paid = usePaidToday()
  const online = useOnlinePlayers()

  const filtered = GAMES.filter((g) =>
    (cat === 'All' || g.category === cat) &&
    g.name.toLowerCase().includes(search.toLowerCase())
  )

  const fmt = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Winners ticker */}
      <div style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)', overflow: 'hidden', height: 32, display: 'flex', alignItems: 'center' }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'marquee 30s linear infinite' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{WINNERS_TEXT.repeat(4)}</span>
        </div>
      </div>

      {/* Hero stats */}
      <div className="hero-stats" style={{ background: 'linear-gradient(180deg, #1a1400 0%, var(--bg) 100%)', padding: '28px 24px', display: 'flex', gap: 24, alignItems: 'center' }}>
        {[
          { label: t('home.jackpot'), value: fmt(jackpot), gold: true, animate: true },
          { label: t('home.paidToday'), value: fmt(paid), gold: false, animate: false },
          { label: t('home.onlineNow'), value: online.toLocaleString(), gold: false, animate: false },
        ].map(({ label, value, gold, animate }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: 2, marginBottom: 4 }}>{label}</div>
            <div className="hero-value" style={{
              fontSize: 22, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
              color: gold ? 'var(--gold)' : 'var(--text)',
              animation: animate ? 'jackpot-tick 1.2s ease infinite' : 'none',
            }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Search + categories */}
      <div className="search-bar" style={{ padding: '16px 24px', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg)' }}>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder={`\u{1F50D} ${t('home.searchGames')}`}
          style={{
            flex: 1, maxWidth: 300, padding: '9px 14px', borderRadius: 8, fontSize: 13,
            background: 'var(--card)', border: '1px solid var(--border2)', color: 'var(--text)', outline: 'none',
            minHeight: 44,
          }}
        />
        <div className="cat-buttons" style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: cat === c ? 'var(--gold)' : 'var(--card)',
              color: cat === c ? '#000' : 'var(--text3)',
              border: `1px solid ${cat === c ? 'var(--gold)' : 'var(--border)'}`,
              transition: 'all 0.15s', whiteSpace: 'nowrap', minHeight: 44, flexShrink: 0,
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Games grid */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px 24px' }} className="games-scroll">
        <div className="games-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {filtered.map((game) => (
            <div key={game.id} className="gcard" onClick={() => (game as any).internal ? navigate((game as any).path || `/games/crash`) : navigate(`/game/${game.id}`)}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12,
                overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', position: 'relative',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--gold)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLDivElement).style.transform = 'none'
              }}
            >
              <div className="gcard-img" style={{ height: 100, background: 'var(--bg2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, position: 'relative' }}>
                {game.img}
                {game.hot && (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: 'var(--red)', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>{t('home.hot')}</div>
                )}
                <div className="play-overlay" style={{
                  position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: 0, transition: 'opacity 0.2s',
                }}>
                  <span style={{ color: '#e4a832', fontWeight: 800, fontSize: 12 }}>▶ Play</span>
                </div>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div className="gcard-name" style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{game.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{game.provider}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>RTP {game.rtp}%</div>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>No games found</div>
        )}
      </div>

      <style>{`
        .gcard:hover .play-overlay { opacity: 1; }

        @media (hover: none) {
          .gcard .play-overlay { opacity: 1; background: rgba(0,0,0,0.4); }
          .gcard:hover { transform: none !important; }
        }

        @media (max-width: 768px) {
          .hero-stats { padding: 16px 12px !important; gap: 12px !important; }
          .hero-value { font-size: 16px !important; }
          .search-bar { padding: 12px !important; flex-direction: column !important; gap: 8px !important; }
          .search-bar input { max-width: 100% !important; }
          .cat-buttons { width: 100%; }
          .games-scroll { padding: 0 12px 12px !important; }
          .games-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
          .gcard-img { height: 70px !important; font-size: 32px !important; }
          .gcard-name { font-size: 10px !important; }
        }

        @media (max-width: 480px) {
          .games-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
