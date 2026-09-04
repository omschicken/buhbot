import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import { getBalance } from '../../api/wallet'
import { api } from '../../api/axios'
import ToastContainer from '../../components/ui/Toast'

// ─── Helpers ────────────────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣']
const CARD_NAMES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
function suitFor(idx: number, pos: number) { return SUITS[(idx * 3 + pos) % 4] }
function cardColor(suit: string) { return suit === '♥' || suit === '♦' ? '#ef4444' : '#fff' }

const winColor = { player: '#3b82f6', banker: '#ef4444', tie: '#22c55e' }

// ─── Web Audio ──────────────────────────────────────────────────────────────
function makeAudio() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const dealSound = () => {
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 900; g.gain.setValueAtTime(0.12, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)
    o.start(); o.stop(ctx.currentTime + 0.07)
  }
  const winSound = () => {
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = f; g.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.09)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.12)
      o.start(ctx.currentTime + i * 0.09); o.stop(ctx.currentTime + i * 0.09 + 0.12)
    })
  }
  const loseSound = () => {
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sawtooth'; o.frequency.value = 180
    g.gain.setValueAtTime(0.07, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    o.start(); o.stop(ctx.currentTime + 0.3)
  }
  return { dealSound, winSound, loseSound }
}

// ─── Types ──────────────────────────────────────────────────────────────────
interface RoundResult {
  roundId: string
  playerCards: number[]
  bankerCards: number[]
  playerScore: number
  bankerScore: number
  winner: 'player' | 'banker' | 'tie'
  payout: number
  profit: number
  isNatural: boolean
  provablyFair: { serverSeed: string; serverSeedHash: string; clientSeed: string; nonce: number }
}
interface HistoryEntry {
  id: string
  winner: 'player' | 'banker' | 'tie'
  profit: number
  total_bet: number
  player_score: number
  banker_score: number
  created_at: string
}

type Tab = 'game' | 'history' | 'fair'
type BetSide = 'player' | 'banker' | 'tie'

// ─── Card ─────────────────────────────────────────────────────────────────────
const CARD_CSS = `
  .bac-slot { width:58px; height:84px; border-radius:8px; flex-shrink:0; border:1px dashed #252525; background:#0d0d0d; }
  @keyframes bac-flip-out { 0%{transform:scaleX(1)} 100%{transform:scaleX(0)} }
  @keyframes bac-flip-in  { 0%{transform:scaleX(0)} 100%{transform:scaleX(1)} }
  .bac-flip-out { animation: bac-flip-out 0.2s ease forwards; }
  .bac-flip-in  { animation: bac-flip-in  0.2s ease forwards; }
`

function PlayingCard({ value, pos, visible }: { value: number; pos: number; visible: boolean }) {
  const [phase, setPhase] = useState<'back' | 'mid' | 'front'>('back')
  const suit = suitFor(value, pos)
  const col = cardColor(suit)

  useEffect(() => {
    if (!visible) { setPhase('back'); return }
    setPhase('mid')
    const t = setTimeout(() => setPhase('front'), 210)
    return () => clearTimeout(t)
  }, [visible])

  const isBack = phase === 'back' || phase === 'mid'
  const animClass = phase === 'mid' ? 'bac-flip-out' : phase === 'front' ? 'bac-flip-in' : ''

  if (isBack) {
    return (
      <div className={animClass} style={{
        width: 58, height: 84, borderRadius: 8, flexShrink: 0,
        background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)',
        border: '1px solid #2563eb', boxShadow: '0 3px 10px rgba(0,0,0,.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 22, opacity: 0.2 }}>♦</div>
      </div>
    )
  }
  return (
    <div className={animClass} style={{
      width: 58, height: 84, borderRadius: 8, flexShrink: 0,
      background: '#fff', border: '1px solid #e5e7eb',
      boxShadow: '0 3px 10px rgba(0,0,0,.6)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    }}>
      <div style={{ fontSize: 15, fontWeight: 900, color: col, lineHeight: 1 }}>{CARD_NAMES[value]}</div>
      <div style={{ fontSize: 18, color: col, lineHeight: 1 }}>{suit}</div>
    </div>
  )
}
function CardSlot() { return <div className="bac-slot" /> }

// ─── Chips ───────────────────────────────────────────────────────────────────
const CHIPS = [
  { value: 1,   color: '#e5e7eb', border: '#9ca3af', text: '#111' },
  { value: 5,   color: '#ef4444', border: '#dc2626', text: '#fff' },
  { value: 10,  color: '#3b82f6', border: '#2563eb', text: '#fff' },
  { value: 25,  color: '#22c55e', border: '#16a34a', text: '#fff' },
  { value: 100, color: '#a855f7', border: '#9333ea', text: '#fff' },
  { value: 500, color: '#f97316', border: '#ea580c', text: '#fff' },
]

// ─── Main ────────────────────────────────────────────────────────────────────
export default function BaccaratGame() {
  const navigate = useNavigate()
  const { token, user, balance, setBalance } = useAuthStore()
  const { addToast } = useUIStore()

  const [tab, setTab] = useState<Tab>('game')
  const [bets, setBets] = useState({ player: 0, banker: 0, tie: 0 })
  const [lastBets, setLastBets] = useState({ player: 0, banker: 0, tie: 0 })
  const [selectedSide, setSelectedSide] = useState<BetSide>('player')
  const [result, setResult] = useState<RoundResult | null>(null)
  const [visibleCards, setVisibleCards] = useState<{ player: number[]; banker: number[] }>({ player: [], banker: [] })
  const [dealing, setDealing] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [sessionHistory, setSessionHistory] = useState<Array<{ winner: 'player' | 'banker' | 'tie' }>>([])
  const [customSeed, setCustomSeed] = useState('')
  const [muted, setMuted] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const audioRef = useRef<ReturnType<typeof makeAudio> | null>(null)

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setFullscreen(false)
    }
  }
  useEffect(() => {
    const fn = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', fn)
    return () => document.removeEventListener('fullscreenchange', fn)
  }, [])

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      try { audioRef.current = makeAudio() } catch { return null }
    }
    return audioRef.current
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const r = await api.get('/baccarat/history')
      setHistory((r.data?.data?.items || []).slice(0, 30))
    } catch { }
  }, [])

  useEffect(() => {
    if (!token) return
    getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})
    loadHistory()
  }, [token])

  const totalBet = bets.player + bets.banker + bets.tie

  const addChip = (value: number) => {
    if (dealing) return
    setBets(prev => ({ ...prev, [selectedSide]: +(prev[selectedSide] + value).toFixed(2) }))
  }
  const clearBets = () => { if (!dealing) setBets({ player: 0, banker: 0, tie: 0 }) }
  const rebet = (mult = 1) => {
    if (dealing) return
    setBets({ player: +(lastBets.player * mult).toFixed(2), banker: +(lastBets.banker * mult).toFixed(2), tie: +(lastBets.tie * mult).toFixed(2) })
  }

  const deal = async () => {
    if (dealing || totalBet <= 0 || !token) return
    setDealing(true)
    setResult(null)
    setVisibleCards({ player: [], banker: [] })
    try {
      const r = await api.post('/baccarat/play', {
        betPlayer: bets.player,
        betBanker: bets.banker,
        betTie: bets.tie,
        clientSeed: customSeed || undefined,
      })
      const data: RoundResult = r.data.data
      setLastBets({ ...bets })

      // Показываем все нужные карты рубашкой сразу
      setVisibleCards({ player: [], banker: [] })
      // небольшая пауза чтобы рубашки отрисовались
      await new Promise(res => setTimeout(res, 150))

      const order: Array<{ side: 'player' | 'banker'; idx: number }> = [
        { side: 'player', idx: 0 }, { side: 'banker', idx: 0 },
        { side: 'player', idx: 1 }, { side: 'banker', idx: 1 },
      ]
      if (data.playerCards.length > 2) order.push({ side: 'player', idx: 2 })
      if (data.bankerCards.length > 2) order.push({ side: 'banker', idx: 2 })

      // Сначала устанавливаем result чтобы карты появились рубашкой
      setResult(data)
      await new Promise(res => setTimeout(res, 50))

      const audio = getAudio()
      for (const { side, idx } of order) {
        await new Promise(res => setTimeout(res, 380))
        if (!muted && audio) audio.dealSound()
        setVisibleCards(prev => ({
          ...prev,
          [side]: prev[side].includes(idx) ? prev[side] : [...prev[side], idx],
        }))
      }
      await new Promise(res => setTimeout(res, 400))
      setSessionHistory(prev => [{ winner: data.winner }, ...prev].slice(0, 30))
      if (!muted && audio) {
        if (data.profit > 0) audio.winSound()
        else if (data.profit < 0) audio.loseSound()
      }
      if (data.profit > 0) addToast(`+$${data.profit.toFixed(2)} 🎉`, 'success')
      getBalance().then(res => setBalance(res.data?.balance ?? 0)).catch(() => {})
      loadHistory()
    } catch (e: any) {
      const msg = e.response?.data?.error || e.message || 'Ошибка'
      addToast(msg, 'error')
    } finally {
      setDealing(false)
    }
  }

  const totalP = sessionHistory.length
  const pWins = sessionHistory.filter(h => h.winner === 'player').length
  const bWins = sessionHistory.filter(h => h.winner === 'banker').length
  const ties  = sessionHistory.filter(h => h.winner === 'tie').length

  const winLabel = { player: 'PLAYER WINS', banker: 'BANKER WINS', tie: 'TIE' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100svh', background: '#0a0a0a', color: '#fff', overflow: 'hidden', fontFamily: 'system-ui,sans-serif' }}>
      <ToastContainer />

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 48, background: '#111', borderBottom: '1px solid #1e1e1e', flexShrink: 0 }}>
        <button onClick={() => navigate('/')}
          style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, color: '#aaa', fontSize: 15, cursor: 'pointer', padding: '5px 9px', lineHeight: 1, flexShrink: 0 }}>
          ←
        </button>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: 0.5, flexShrink: 0 }}>🃏 BACCARAT</span>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#161616', borderRadius: 7, padding: 2, flexShrink: 0 }}>
          {([['game', 'Игра'], ['history', 'История'], ['fair', 'Честность']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '5px 9px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                background: tab === t ? '#252525' : 'none', color: tab === t ? '#fff' : '#555' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />
        <button onClick={() => setMuted(m => !m)}
          style={{ background: 'none', border: 'none', color: '#555', fontSize: 15, cursor: 'pointer', padding: '4px 6px', flexShrink: 0 }}>
          {muted ? '🔇' : '🔊'}
        </button>
        {token && user ? (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 8, color: '#555', letterSpacing: 0.5 }}>БАЛАНС</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#e4a832' }}>${Number(balance).toFixed(2)}</div>
          </div>
        ) : (
          <button onClick={() => navigate('/login')}
            style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#e4a832', color: '#000', fontSize: 11, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
            Войти
          </button>
        )}
        <button onClick={toggleFullscreen}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7, color: '#888', fontSize: 14, cursor: 'pointer', padding: '5px 8px', lineHeight: 1, flexShrink: 0 }}>
          {fullscreen ? '⊡' : '⛶'}
        </button>
      </div>

      {/* ── SESSION DOTS BAR ── */}
      {tab === 'game' && totalP > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: '#0e0e0e', borderBottom: '1px solid #181818', overflowX: 'auto', flexShrink: 0 }}>
          <span style={{ fontSize: 8, color: '#444', letterSpacing: 1, flexShrink: 0 }}>СЕССИЯ</span>
          <span style={{ fontSize: 9, color: winColor.player, flexShrink: 0 }}>P {Math.round(pWins / totalP * 100)}%</span>
          <span style={{ fontSize: 9, color: winColor.banker, flexShrink: 0 }}>B {Math.round(bWins / totalP * 100)}%</span>
          <span style={{ fontSize: 9, color: winColor.tie, flexShrink: 0 }}>T {Math.round(ties / totalP * 100)}%</span>
          <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
            {sessionHistory.slice(0, 25).map((h, i) => (
              <div key={i} style={{
                width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                background: winColor[h.winner], fontSize: 7,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000',
              }}>
                {h.winner[0].toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: GAME ── */}
      {tab === 'game' && (
        <>
          {/* Table area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 14px', gap: 6, minHeight: 0, background: '#0d0d0d' }}>

            {/* Banker zone */}
            <div style={{
              width: '100%', maxWidth: 500, padding: '12px 16px',
              background: '#111', borderRadius: 12,
              boxShadow: result?.winner === 'banker' ? `0 0 24px ${winColor.banker}55` : 'none',
              borderLeft: `3px solid ${result?.winner === 'banker' ? winColor.banker : '#222'}`,
              transition: 'box-shadow 0.4s, border-color 0.4s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: winColor.banker, letterSpacing: 2 }}>BANKER</span>
                <span style={{ fontSize: 28, fontWeight: 900, color: result ? '#fff' : '#1e1e1e', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {result ? result.bankerScore : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[0, 1, 2].map(i => {
                  if (!dealing && !result) return <CardSlot key={i} />
                  const has = result && i < result.bankerCards.length
                  const inDeal = dealing && !result
                  if (!has && !inDeal) return <CardSlot key={i} />
                  return has
                    ? <PlayingCard key={i} value={result!.bankerCards[i]} pos={i} visible={visibleCards.banker.includes(i)} />
                    : <PlayingCard key={i} value={0} pos={i} visible={false} />
                })}
              </div>
            </div>

            {/* Middle result */}
            <div style={{ height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {result ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 900, color: winColor[result.winner], letterSpacing: 3 }}>
                    {winLabel[result.winner]}{result.isNatural ? ' ✨' : ''}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: result.profit > 0 ? '#22c55e' : result.profit < 0 ? '#ef4444' : '#888', marginTop: 3 }}>
                    {result.profit > 0 ? `+$${result.profit.toFixed(2)}` : result.profit < 0 ? `-$${Math.abs(result.profit).toFixed(2)}` : 'PUSH'}
                  </div>
                </div>
              ) : dealing ? (
                <div style={{ fontSize: 11, color: '#e4a832', letterSpacing: 2 }}>РАЗДАЧА...</div>
              ) : (
                <div style={{ fontSize: 10, color: '#252525', letterSpacing: 2 }}>PLACE YOUR BETS</div>
              )}
            </div>

            {/* Player zone */}
            <div style={{
              width: '100%', maxWidth: 500, padding: '12px 16px',
              background: '#111', borderRadius: 12,
              boxShadow: result?.winner === 'player' ? `0 0 24px ${winColor.player}55` : 'none',
              borderLeft: `3px solid ${result?.winner === 'player' ? winColor.player : '#222'}`,
              transition: 'box-shadow 0.4s, border-color 0.4s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: winColor.player, letterSpacing: 2 }}>PLAYER</span>
                <span style={{ fontSize: 28, fontWeight: 900, color: result ? '#fff' : '#1e1e1e', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                  {result ? result.playerScore : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[0, 1, 2].map(i => {
                  if (!dealing && !result) return <CardSlot key={i} />
                  const has = result && i < result.playerCards.length
                  const inDeal = dealing && !result
                  if (!has && !inDeal) return <CardSlot key={i} />
                  return has
                    ? <PlayingCard key={i} value={result!.playerCards[i]} pos={i + 3} visible={visibleCards.player.includes(i)} />
                    : <PlayingCard key={i} value={0} pos={i + 3} visible={false} />
                })}
              </div>
            </div>
          </div>

          {/* ── BET PANEL ── */}
          <div style={{ background: '#111', borderTop: '1px solid #1e1e1e', padding: '8px 10px', flexShrink: 0 }}>
            {/* Bet sides */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
              {(['player', 'banker', 'tie'] as BetSide[]).map(side => (
                <button key={side} onClick={() => setSelectedSide(side)} disabled={dealing}
                  style={{
                    flex: side === 'tie' ? '0 0 68px' : 1, borderRadius: 7,
                    border: `2px solid ${selectedSide === side ? winColor[side] : '#252525'}`,
                    background: selectedSide === side ? `${winColor[side]}18` : '#161616',
                    color: selectedSide === side ? winColor[side] : '#555',
                    cursor: 'pointer', padding: '6px 4px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                  }}>
                  <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>{side.toUpperCase()}</span>
                  <span style={{ fontSize: 8, color: '#444' }}>{side === 'player' ? '1:1' : side === 'banker' ? '0.95:1' : '8:1'}</span>
                  <span style={{ fontSize: 12, fontWeight: 900, color: bets[side] > 0 ? '#e4a832' : '#333' }}>
                    ${bets[side] > 0 ? bets[side].toFixed(2) : '0'}
                  </span>
                </button>
              ))}
            </div>

            {/* Chips */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 7, justifyContent: 'center' }}>
              {CHIPS.map(chip => (
                <button key={chip.value} onClick={() => addChip(chip.value)} disabled={dealing}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', border: `3px solid ${chip.border}`,
                    background: chip.color, color: chip.text, fontSize: 9, fontWeight: 900, cursor: 'pointer',
                    flexShrink: 0, transition: 'transform 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.12)')}
                  onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
                  {chip.value >= 1000 ? `${chip.value / 1000}K` : chip.value}
                </button>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={clearBets} disabled={dealing || totalBet === 0}
                style={{ flex: 1, padding: '10px', borderRadius: 7, border: '1px solid #252525', background: '#161616', color: '#888', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: totalBet === 0 ? 0.4 : 1 }}>
                CLEAR
              </button>
              {lastBets.player + lastBets.banker + lastBets.tie > 0 && (
                <>
                  <button onClick={() => rebet()} disabled={dealing}
                    style={{ flex: 1, padding: '10px', borderRadius: 7, border: '1px solid #252525', background: '#161616', color: '#aaa', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    REBET
                  </button>
                  <button onClick={() => rebet(2)} disabled={dealing}
                    style={{ flex: 1, padding: '10px', borderRadius: 7, border: '1px solid #252525', background: '#161616', color: '#aaa', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    ×2
                  </button>
                </>
              )}
              <button onClick={deal} disabled={dealing || totalBet === 0 || !token}
                style={{
                  flex: 2, padding: '10px', borderRadius: 7, border: 'none',
                  background: dealing || totalBet === 0 || !token ? '#252525' : 'linear-gradient(135deg,#e4a832,#c88c1a)',
                  color: dealing || totalBet === 0 || !token ? '#555' : '#000',
                  fontSize: 13, fontWeight: 900, cursor: 'pointer', letterSpacing: 1,
                }}>
                {dealing ? '...' : !token ? 'ВОЙТИ' : totalBet === 0 ? 'DEAL' : `DEAL  $${totalBet.toFixed(2)}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: HISTORY ── */}
      {tab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#333', fontSize: 13, marginTop: 40 }}>Нет истории</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {history.map(h => (
                <div key={h.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#111', borderRadius: 8, padding: '8px 12px',
                  border: `1px solid ${winColor[h.winner]}22`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${winColor[h.winner]}22`, border: `2px solid ${winColor[h.winner]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: winColor[h.winner] }}>
                      {h.winner[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: winColor[h.winner] }}>{h.winner === 'player' ? 'Player' : h.winner === 'banker' ? 'Banker' : 'Tie'}</div>
                      <div style={{ fontSize: 9, color: '#444' }}>{h.player_score} : {h.banker_score}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: h.profit > 0 ? '#22c55e' : h.profit < 0 ? '#ef4444' : '#888' }}>
                      {h.profit > 0 ? `+$${Number(h.profit).toFixed(2)}` : h.profit < 0 ? `-$${Math.abs(Number(h.profit)).toFixed(2)}` : 'PUSH'}
                    </div>
                    <div style={{ fontSize: 9, color: '#444' }}>Ставка ${Number(h.total_bet).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: FAIR ── */}
      {tab === 'fair' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#e4a832', marginBottom: 16 }}>🛡 Provably Fair</div>
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6, marginBottom: 16 }}>
              Каждый раунд генерируется с помощью HMAC-SHA256. Серверный seed хешируется заранее — вы можете проверить честность после раунда.
            </div>
            {result ? (
              <>
                {[
                  ['SERVER SEED', result.provablyFair.serverSeed],
                  ['SERVER SEED HASH (SHA-256)', result.provablyFair.serverSeedHash],
                  ['CLIENT SEED', result.provablyFair.clientSeed],
                  ['NONCE', String(result.provablyFair.nonce)],
                ].map(([label, val]) => (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#aaa', wordBreak: 'break-all', background: '#161616', padding: '8px 10px', borderRadius: 7, border: '1px solid #252525' }}>{val}</div>
                  </div>
                ))}
              </>
            ) : (
              <div style={{ fontSize: 11, color: '#333', marginBottom: 16 }}>Сыграйте раунд чтобы увидеть данные</div>
            )}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 4 }}>СВОЙ CLIENT SEED (опционально)</div>
              <input value={customSeed} onChange={e => setCustomSeed(e.target.value)}
                placeholder="Введите свой seed..."
                style={{ width: '100%', boxSizing: 'border-box', background: '#161616', border: '1px solid #252525', borderRadius: 7, padding: '8px 10px', color: '#fff', fontSize: 11, outline: 'none' }} />
            </div>
          </div>
        </div>
      )}

      <style>{CARD_CSS}</style>
    </div>
  )
}
