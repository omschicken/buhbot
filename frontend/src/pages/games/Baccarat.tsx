import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { getBalance } from '../../api/wallet'
import { api } from '../../api/axios'



// ─── Suit / card helpers ────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣']
const CARD_NAMES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
function suitFor(idx: number, pos: number) { return SUITS[(idx * 3 + pos) % 4] }
function cardColor(suit: string) { return suit === '♥' || suit === '♦' ? '#e53e3e' : '#fff' }

// ─── Web Audio ──────────────────────────────────────────────────────────────
function makeAudio() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const dealSound = () => {
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 800; g.gain.setValueAtTime(0.15, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
    o.start(); o.stop(ctx.currentTime + 0.08)
  }
  const winSound = () => {
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = f; g.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.1)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.15)
      o.start(ctx.currentTime + i * 0.1); o.stop(ctx.currentTime + i * 0.1 + 0.15)
    })
  }
  const loseSound = () => {
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = 'sawtooth'; o.frequency.value = 200
    g.gain.setValueAtTime(0.08, ctx.currentTime)
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

// ─── Card component ──────────────────────────────────────────────────────────
function PlayingCard({ value, pos, visible, delay }: { value: number; pos: number; visible: boolean; delay: number }) {
  const suit = suitFor(value, pos)
  const color = cardColor(suit)
  return (
    <div style={{
      width: 56, height: 80, borderRadius: 8, position: 'relative',
      transition: `transform 0.4s ease ${delay}ms, opacity 0.4s ease ${delay}ms`,
      transform: visible ? 'rotateY(0deg)' : 'rotateY(90deg)',
      opacity: visible ? 1 : 0,
      perspective: '600px',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 8,
        background: '#fff', border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 13, fontWeight: 900, color, lineHeight: 1 }}>{CARD_NAMES[value]}</div>
        <div style={{ fontSize: 16, color, lineHeight: 1 }}>{suit}</div>
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div style={{
      width: 56, height: 80, borderRadius: 8, flexShrink: 0,
      background: 'linear-gradient(135deg,#1a365d,#2b6cb0)',
      border: '1px solid #2d3748',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ fontSize: 20, opacity: 0.4 }}>🂠</div>
    </div>
  )
}

// ─── Chip component ───────────────────────────────────────────────────────────
const CHIPS = [
  { value: 1, color: '#fff', border: '#999', text: '#333' },
  { value: 5, color: '#e53e3e', border: '#c53030', text: '#fff' },
  { value: 10, color: '#3182ce', border: '#2b6cb0', text: '#fff' },
  { value: 25, color: '#38a169', border: '#276749', text: '#fff' },
  { value: 100, color: '#805ad5', border: '#6b46c1', text: '#fff' },
  { value: 500, color: '#c05621', border: '#9c4221', text: '#fff' },
]

type BetSide = 'player' | 'banker' | 'tie' | null

export default function BaccaratGame() {
  const navigate = useNavigate()
  const { token, user, balance, setBalance } = useAuthStore()
  const [bets, setBets] = useState({ player: 0, banker: 0, tie: 0 })
  const [lastBets, setLastBets] = useState({ player: 0, banker: 0, tie: 0 })
  const [selectedSide, setSelectedSide] = useState<BetSide>('player')
  const [result, setResult] = useState<RoundResult | null>(null)
  const [visibleCards, setVisibleCards] = useState<{ player: number[]; banker: number[] }>({ player: [], banker: [] })
  const [dealing, setDealing] = useState(false)
  const [_history, setHistory] = useState<HistoryEntry[]>([])
  const [sessionHistory, setSessionHistory] = useState<Array<{ winner: 'player' | 'banker' | 'tie' }>>([])
  const [fairModal, setFairModal] = useState(false)
  const [customSeed, setCustomSeed] = useState('')
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<ReturnType<typeof makeAudio> | null>(null)

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      try { audioRef.current = makeAudio() } catch { return null }
    }
    return audioRef.current
  }, [])

  useEffect(() => {
    if (!token) return
    getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})
    loadHistory()
  }, [token])

  const loadHistory = async () => {
    try {
      const r = await api.get('/baccarat/history')
      setHistory((r.data?.data?.items || []).slice(0, 20))
    } catch { }
  }

  const totalBet = bets.player + bets.banker + bets.tie

  const addChip = (value: number) => {
    if (!selectedSide || dealing) return
    setBets(prev => ({ ...prev, [selectedSide]: +(prev[selectedSide] + value).toFixed(2) }))
  }

  const clearBets = () => { if (!dealing) setBets({ player: 0, banker: 0, tie: 0 }) }

  const rebet = (multiplier = 1) => {
    if (dealing) return
    setBets({ player: +(lastBets.player * multiplier).toFixed(2), banker: +(lastBets.banker * multiplier).toFixed(2), tie: +(lastBets.tie * multiplier).toFixed(2) })
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

      // Animate cards one by one: P1, B1, P2, B2, [P3], [B3]
      const order: Array<{ side: 'player' | 'banker'; idx: number }> = [
        { side: 'player', idx: 0 }, { side: 'banker', idx: 0 },
        { side: 'player', idx: 1 }, { side: 'banker', idx: 1 },
      ]
      if (data.playerCards.length > 2) order.push({ side: 'player', idx: 2 })
      if (data.bankerCards.length > 2) order.push({ side: 'banker', idx: 2 })

      const audio = getAudio()
      for (const { side, idx } of order) {
        await new Promise(r => setTimeout(r, 350))
        if (!muted && audio) audio.dealSound()
        setVisibleCards(prev => ({
          ...prev,
          [side]: prev[side].includes(idx) ? prev[side] : [...prev[side], idx]
        }))
      }

      await new Promise(r => setTimeout(r, 300))
      setResult(data)
      setSessionHistory(prev => [{ winner: data.winner }, ...prev].slice(0, 30))

      if (!muted && audio) {
        if (data.profit > 0) audio.winSound()
        else if (data.profit < 0) audio.loseSound()
      }

      getBalance().then(res => setBalance(res.data?.balance ?? 0)).catch(() => {})
      loadHistory()
    } catch (e: any) {
      alert(e.response?.data?.error || e.message || 'Ошибка')
    } finally {
      setDealing(false)
    }
  }

  const winnerLabel = { player: 'PLAYER WINS', banker: 'BANKER WINS', tie: 'TIE' }
  const winnerColor = { player: '#3182ce', banker: '#e53e3e', tie: '#38a169' }
  const sideColor = { player: '#3182ce', banker: '#e53e3e', tie: '#38a169' }

  const totalP = sessionHistory.length
  const pWins = sessionHistory.filter(h => h.winner === 'player').length
  const bWins = sessionHistory.filter(h => h.winner === 'banker').length
  const ties = sessionHistory.filter(h => h.winner === 'tie').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100svh', background: '#0f1923', color: '#fff', overflow: 'hidden', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 48, background: '#111', borderBottom: '1px solid #1e2a3a', flexShrink: 0 }}>
        <button onClick={() => navigate('/')} style={{ background: '#1a2535', border: '1px solid #2a3a50', borderRadius: 7, color: '#aaa', fontSize: 15, cursor: 'pointer', padding: '5px 9px' }}>←</button>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#e4a832', letterSpacing: 1 }}>🃏 BACCARAT</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setMuted(m => !m)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 16, cursor: 'pointer' }}>{muted ? '🔇' : '🔊'}</button>
        <button onClick={() => setFairModal(true)} style={{ background: '#1a2535', border: '1px solid #2a3a50', borderRadius: 7, color: '#888', fontSize: 11, cursor: 'pointer', padding: '4px 8px', fontWeight: 700 }}>🛡 FAIR</button>
        {token && user && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, color: '#555', letterSpacing: 0.5 }}>БАЛАНС</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#e4a832' }}>${Number(balance).toFixed(2)}</div>
          </div>
        )}
        {!token && <button onClick={() => navigate('/login')} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#e4a832', color: '#000', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Войти</button>}
      </div>

      {/* Session stats */}
      {totalP > 0 && (
        <div style={{ display: 'flex', gap: 16, padding: '5px 14px', background: '#0d1520', borderBottom: '1px solid #1a2535', fontSize: 10, color: '#666', flexShrink: 0 }}>
          <span style={{ color: '#3182ce' }}>P {totalP ? Math.round(pWins / totalP * 100) : 0}%</span>
          <span style={{ color: '#e53e3e' }}>B {totalP ? Math.round(bWins / totalP * 100) : 0}%</span>
          <span style={{ color: '#38a169' }}>T {totalP ? Math.round(ties / totalP * 100) : 0}%</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 3, overflowX: 'auto' }}>
            {sessionHistory.slice(0, 20).map((h, i) => (
              <div key={i} style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, background: winnerColor[h.winner], fontSize: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff' }}>
                {h.winner[0].toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0', gap: 8, minHeight: 0 }}>
        {/* Banker zone */}
        <div style={{ width: '100%', maxWidth: 480, padding: '10px 16px', background: '#0d1a2a', borderRadius: 12, border: `2px solid ${result?.winner === 'banker' ? '#e53e3e' : '#1a2535'}`, transition: 'border-color 0.4s', boxShadow: result?.winner === 'banker' ? '0 0 20px #e53e3e44' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#e53e3e', letterSpacing: 2 }}>BANKER</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: result ? '#fff' : '#2a3a50', minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {result ? result.bankerScore : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map(i => {
              const hasCard = result && i < result.bankerCards.length
              const visible = visibleCards.banker.includes(i)
              return hasCard
                ? <PlayingCard key={i} value={result!.bankerCards[i]} pos={i} visible={visible} delay={0} />
                : <CardBack key={i} />
            })}
          </div>
        </div>

        {/* Result */}
        <div style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {result && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: winnerColor[result.winner], letterSpacing: 2 }}>
                {winnerLabel[result.winner]}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: result.profit > 0 ? '#38a169' : result.profit < 0 ? '#e53e3e' : '#888' }}>
                {result.profit > 0 ? `+$${result.profit.toFixed(2)}` : result.profit < 0 ? `-$${Math.abs(result.profit).toFixed(2)}` : 'PUSH'}
              </div>
            </div>
          )}
          {!result && !dealing && <div style={{ fontSize: 11, color: '#2a3a50', letterSpacing: 2 }}>PLACE YOUR BETS</div>}
          {dealing && <div style={{ fontSize: 11, color: '#e4a832', letterSpacing: 2 }}>DEALING...</div>}
        </div>

        {/* Player zone */}
        <div style={{ width: '100%', maxWidth: 480, padding: '10px 16px', background: '#0d1a2a', borderRadius: 12, border: `2px solid ${result?.winner === 'player' ? '#3182ce' : '#1a2535'}`, transition: 'border-color 0.4s', boxShadow: result?.winner === 'player' ? '0 0 20px #3182ce44' : 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: '#3182ce', letterSpacing: 2 }}>PLAYER</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: result ? '#fff' : '#2a3a50', minWidth: 32, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              {result ? result.playerScore : '—'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0, 1, 2].map(i => {
              const hasCard = result && i < result.playerCards.length
              const visible = visibleCards.player.includes(i)
              return hasCard
                ? <PlayingCard key={i} value={result!.playerCards[i]} pos={i + 3} visible={visible} delay={0} />
                : <CardBack key={i} />
            })}
          </div>
        </div>
      </div>

      {/* Bet panel */}
      <div style={{ background: '#111', borderTop: '1px solid #1a2535', padding: '8px 12px', flexShrink: 0 }}>
        {/* Bet sides */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {(['player', 'banker', 'tie'] as const).map(side => (
            <button key={side} onClick={() => setSelectedSide(side)} disabled={dealing}
              style={{
                flex: side === 'tie' ? '0 0 70px' : 1, borderRadius: 8, border: `2px solid ${selectedSide === side ? sideColor[side] : '#2a3a50'}`,
                background: selectedSide === side ? `${sideColor[side]}18` : '#161f2c',
                color: selectedSide === side ? sideColor[side] : '#555',
                cursor: 'pointer', padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              }}>
              <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>{side.toUpperCase()}</span>
              <span style={{ fontSize: 8, color: '#444' }}>{side === 'player' ? '1:1' : side === 'banker' ? '0.95:1' : '8:1'}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: bets[side] > 0 ? '#e4a832' : '#333' }}>
                ${bets[side] > 0 ? bets[side].toFixed(2) : '0'}
              </span>
            </button>
          ))}
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 8, justifyContent: 'center' }}>
          {CHIPS.map(chip => (
            <button key={chip.value} onClick={() => addChip(chip.value)} disabled={dealing || !selectedSide}
              style={{
                width: 42, height: 42, borderRadius: '50%', border: `3px solid ${chip.border}`,
                background: chip.color, color: chip.text, fontSize: 10, fontWeight: 900, cursor: 'pointer',
                transition: 'transform 0.1s', flexShrink: 0,
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.12)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)' }}>
              {chip.value >= 1000 ? `${chip.value / 1000}K` : chip.value}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={clearBets} disabled={dealing || totalBet === 0}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #2a3a50', background: '#161f2c', color: '#888', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            CLEAR
          </button>
          {result && (
            <>
              <button onClick={() => rebet()} disabled={dealing}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #2a3a50', background: '#161f2c', color: '#aaa', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                REBET
              </button>
              <button onClick={() => rebet(2)} disabled={dealing}
                style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #2a3a50', background: '#161f2c', color: '#aaa', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                x2
              </button>
            </>
          )}
          <button onClick={deal} disabled={dealing || totalBet === 0 || !token}
            style={{
              flex: 2, padding: '10px', borderRadius: 8, border: 'none',
              background: dealing || totalBet === 0 || !token ? '#2a3a50' : 'linear-gradient(135deg,#e4a832,#c88c1a)',
              color: dealing || totalBet === 0 || !token ? '#555' : '#000',
              fontSize: 14, fontWeight: 900, cursor: 'pointer', letterSpacing: 1,
            }}>
            {dealing ? '...' : !token ? 'ВОЙТИ' : `DEAL $${totalBet.toFixed(2)}`}
          </button>
        </div>
      </div>

      {/* Provably Fair Modal */}
      {fairModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
          onClick={() => setFairModal(false)}>
          <div style={{ background: '#111', borderRadius: 12, padding: 24, maxWidth: 420, width: '90%', border: '1px solid #2a3a50' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#e4a832', marginBottom: 16 }}>🛡 Provably Fair</div>
            {result ? (
              <>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>SERVER SEED</div>
                  <div style={{ fontSize: 11, color: '#aaa', wordBreak: 'break-all', background: '#0d1520', padding: 8, borderRadius: 6 }}>{result.provablyFair.serverSeed}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>CLIENT SEED</div>
                  <div style={{ fontSize: 11, color: '#aaa', wordBreak: 'break-all', background: '#0d1520', padding: 8, borderRadius: 6 }}>{result.provablyFair.clientSeed}</div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>NONCE</div>
                  <div style={{ fontSize: 11, color: '#aaa', background: '#0d1520', padding: 8, borderRadius: 6 }}>{result.provablyFair.nonce}</div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>HASH (SHA-256)</div>
                  <div style={{ fontSize: 10, color: '#38a169', wordBreak: 'break-all', background: '#0d1520', padding: 8, borderRadius: 6 }}>{result.provablyFair.serverSeedHash}</div>
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: '#555', marginBottom: 12 }}>Сыграйте раунд чтобы увидеть сиды</div>
            )}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>СВОЙ CLIENT SEED (опционально)</div>
              <input value={customSeed} onChange={e => setCustomSeed(e.target.value)}
                placeholder="Введите свой seed..."
                style={{ width: '100%', boxSizing: 'border-box', background: '#0d1520', border: '1px solid #2a3a50', borderRadius: 6, padding: '8px', color: '#fff', fontSize: 11, outline: 'none' }} />
            </div>
            <button onClick={() => setFairModal(false)}
              style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#e4a832', color: '#000', fontWeight: 900, fontSize: 13, cursor: 'pointer' }}>
              Закрыть
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:0.7} }
      `}</style>
    </div>
  )
}
