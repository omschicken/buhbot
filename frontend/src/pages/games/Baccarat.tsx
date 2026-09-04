import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import { getBalance } from '../../api/wallet'
import { api } from '../../api/axios'
import ToastContainer from '../../components/ui/Toast'

const SUITS = ['♠', '♥', '♦', '♣']
const CARD_NAMES = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
function suitFor(idx: number, pos: number) { return SUITS[(idx * 3 + pos) % 4] }
function isRed(suit: string) { return suit === '♥' || suit === '♦' }

const W = { player: '#3b82f6', banker: '#ef4444', tie: '#22c55e' }

function makeAudio() {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
  const beep = (freq: number, dur: number, vol = 0.1) => {
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = freq; g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    o.start(); o.stop(ctx.currentTime + dur)
  }
  return {
    deal: () => beep(900, 0.07),
    win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.12, 0.09), i * 90)),
    lose: () => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'sawtooth'; o.connect(g); g.connect(ctx.destination); o.frequency.value = 180; g.gain.setValueAtTime(0.07, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); o.start(); o.stop(ctx.currentTime + 0.3) },
  }
}

interface RoundResult {
  roundId: string; playerCards: number[]; bankerCards: number[]
  playerScore: number; bankerScore: number; winner: 'player' | 'banker' | 'tie'
  payout: number; profit: number; isNatural: boolean
  provablyFair: { serverSeed: string; serverSeedHash: string; clientSeed: string; nonce: number }
}
interface HistoryEntry {
  id: string; winner: 'player' | 'banker' | 'tie'; profit: number
  total_bet: number; player_score: number; banker_score: number; created_at: string
}
type Tab = 'game' | 'history' | 'fair'
type Side = 'player' | 'banker' | 'tie'

const CHIPS = [
  { v: 1, bg: '#e5e7eb', bd: '#9ca3af', tx: '#111' },
  { v: 5, bg: '#ef4444', bd: '#dc2626', tx: '#fff' },
  { v: 10, bg: '#3b82f6', bd: '#2563eb', tx: '#fff' },
  { v: 25, bg: '#22c55e', bd: '#16a34a', tx: '#fff' },
  { v: 100, bg: '#a855f7', bd: '#9333ea', tx: '#fff' },
  { v: 500, bg: '#f97316', bd: '#ea580c', tx: '#fff' },
]

const CSS = `
  .bac { display:flex; flex-direction:column; width:100%; height:100svh; background:#0a0a0a; color:#fff; overflow:hidden; font-family:system-ui,sans-serif; }
  .bac-hdr { display:flex; align-items:center; gap:6px; padding:0 10px; height:48px; background:#111; border-bottom:1px solid #1e1e1e; flex-shrink:0; }
  .bac-tabs { display:flex; background:#161616; border-radius:7px; padding:2px; }
  .bac-tab { padding:5px 9px; border-radius:5px; border:none; font-size:10px; font-weight:700; cursor:pointer; white-space:nowrap; background:none; color:#555; }
  .bac-tab.on { background:#252525; color:#fff; }
  .bac-btn { background:#1a1a1a; border:1px solid #252525; border-radius:7px; color:#aaa; font-size:14px; cursor:pointer; padding:5px 9px; line-height:1; }

  .bac-table { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:10px 14px; background:#0d0d0d; min-height:0; overflow:hidden; }

  .bac-zone { width:100%; max-width:500px; background:#111; border-radius:12px; padding:12px 14px; }
  .bac-zone-hdr { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
  .bac-zone-label { font-size:10px; font-weight:900; letter-spacing:2px; }
  .bac-zone-score { font-size:32px; font-weight:900; font-variant-numeric:tabular-nums; line-height:1; }
  .bac-cards { display:flex; gap:8px; align-items:flex-start; }

  .bac-card { width:56px; height:80px; border-radius:8px; flex-shrink:0; position:relative; overflow:hidden; }
  .bac-card-back { width:56px; height:80px; border-radius:8px; flex-shrink:0;
    background:linear-gradient(135deg,#1e3a8a,#1d4ed8); border:1px solid #2563eb;
    box-shadow:0 4px 12px rgba(0,0,0,.7); display:flex; align-items:center; justify-content:center; }
  .bac-card-front { width:56px; height:80px; border-radius:8px; flex-shrink:0;
    background:#fff; border:1px solid #e2e8f0;
    box-shadow:0 4px 12px rgba(0,0,0,.7); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; }
  .bac-card-slot { width:56px; height:80px; border-radius:8px; flex-shrink:0; background:transparent; }

  @keyframes bac-out { 0%{transform:scaleX(1)} 100%{transform:scaleX(0)} }
  @keyframes bac-in  { 0%{transform:scaleX(0)} 100%{transform:scaleX(1)} }
  .bac-anim-out { animation:bac-out .18s ease forwards; }
  .bac-anim-in  { animation:bac-in  .18s ease forwards; }

  .bac-mid { height:50px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

  .bac-panel { background:#111; border-top:1px solid #1e1e1e; padding:8px 10px; flex-shrink:0; }
  .bac-sides { display:flex; gap:5px; margin-bottom:8px; }
  .bac-side { border-radius:8px; border:2px solid #252525; background:#161616; color:#555; cursor:pointer; padding:7px 6px; display:flex; flex-direction:column; align-items:center; gap:2px; }
  .bac-side.on { border-color:var(--c); background:color-mix(in srgb, var(--c) 12%, transparent); color:var(--c); }
  .bac-chips { display:flex; gap:5px; margin-bottom:8px; justify-content:center; }
  .bac-chip { border-radius:50%; cursor:pointer; font-size:9px; font-weight:900; transition:transform .1s; }
  .bac-chip:hover { transform:scale(1.12); }
  .bac-actions { display:flex; gap:5px; }
  .bac-act { flex:1; padding:11px; border-radius:8px; border:1px solid #252525; background:#161616; color:#888; font-size:11px; font-weight:700; cursor:pointer; }
  .bac-deal { flex:2; padding:11px; border-radius:8px; border:none; font-size:13px; font-weight:900; cursor:pointer; letter-spacing:1px; }

  .bac-hist-row { display:flex; align-items:center; justify-content:space-between; background:#111; border-radius:8px; padding:9px 12px; margin-bottom:5px; }
  .bac-dots { display:flex; gap:3px; overflow-x:auto; }
  .bac-dot { width:14px; height:14px; border-radius:50%; flex-shrink:0; font-size:7px; display:flex; align-items:center; justify-content:center; font-weight:900; }
  .bac-fair-field { background:#161616; border:1px solid #252525; border-radius:7px; padding:8px 10px; font-size:10px; color:#aaa; word-break:break-all; margin-top:3px; }
`

function Card({ value, pos, visible }: { value: number; pos: number; visible: boolean }) {
  const [phase, setPhase] = useState<'back' | 'out' | 'front'>('back')
  const suit = suitFor(value, pos)
  const red = isRed(suit)

  useEffect(() => {
    if (!visible) { setPhase('back'); return }
    setPhase('out')
    const t = setTimeout(() => setPhase('front'), 190)
    return () => clearTimeout(t)
  }, [visible])

  if (phase === 'front') return (
    <div className="bac-card-front bac-anim-in">
      <div style={{ fontSize: 14, fontWeight: 900, color: red ? '#dc2626' : '#111', lineHeight: 1 }}>{CARD_NAMES[value]}</div>
      <div style={{ fontSize: 20, color: red ? '#dc2626' : '#111', lineHeight: 1 }}>{suit}</div>
    </div>
  )
  return (
    <div className={`bac-card-back${phase === 'out' ? ' bac-anim-out' : ''}`}>
      <div style={{ fontSize: 24, opacity: 0.18, color: '#fff' }}>♦</div>
    </div>
  )
}

export default function BaccaratGame() {
  const navigate = useNavigate()
  const { token, user, balance, setBalance } = useAuthStore()
  const { addToast } = useUIStore()

  const [tab, setTab] = useState<Tab>('game')
  const [bets, setBets] = useState({ player: 0, banker: 0, tie: 0 })
  const [lastBets, setLastBets] = useState({ player: 0, banker: 0, tie: 0 })
  const [side, setSide] = useState<Side>('player')
  const [result, setResult] = useState<RoundResult | null>(null)
  const [vis, setVis] = useState<{ player: number[]; banker: number[] }>({ player: [], banker: [] })
  const [dealing, setDealing] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [sesHist, setSesHist] = useState<Array<{ w: Side }>>([])
  const [customSeed, setCustomSeed] = useState('')
  const [muted, setMuted] = useState(false)
  const audioRef = useRef<ReturnType<typeof makeAudio> | null>(null)

  const audio = useCallback(() => {
    if (!audioRef.current) try { audioRef.current = makeAudio() } catch { return null }
    return audioRef.current
  }, [])

  const loadHist = useCallback(async () => {
    try { const r = await api.get('/baccarat/history'); setHistory((r.data?.data?.items || []).slice(0, 30)) } catch { }
  }, [])

  useEffect(() => {
    if (!token) return
    getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})
    loadHist()
  }, [token])

  const total = bets.player + bets.banker + bets.tie
  const addChip = (v: number) => { if (!dealing) setBets(p => ({ ...p, [side]: +(p[side] + v).toFixed(2) })) }
  const clear = () => { if (!dealing) setBets({ player: 0, banker: 0, tie: 0 }) }
  const rebet = (m = 1) => { if (!dealing) setBets({ player: +(lastBets.player * m).toFixed(2), banker: +(lastBets.banker * m).toFixed(2), tie: +(lastBets.tie * m).toFixed(2) }) }

  const deal = async () => {
    if (dealing || total <= 0 || !token) return
    setDealing(true); setResult(null); setVis({ player: [], banker: [] })
    try {
      const r = await api.post('/baccarat/play', { betPlayer: bets.player, betBanker: bets.banker, betTie: bets.tie, clientSeed: customSeed || undefined })
      const d: RoundResult = r.data.data
      setLastBets({ ...bets })
      setResult(d)
      await new Promise(res => setTimeout(res, 80))
      const order: Array<{ s: 'player' | 'banker'; i: number }> = [
        { s: 'player', i: 0 }, { s: 'banker', i: 0 },
        { s: 'player', i: 1 }, { s: 'banker', i: 1 },
      ]
      if (d.playerCards.length > 2) order.push({ s: 'player', i: 2 })
      if (d.bankerCards.length > 2) order.push({ s: 'banker', i: 2 })
      const a = audio()
      for (const { s, i } of order) {
        await new Promise(res => setTimeout(res, 370))
        if (!muted && a) a.deal()
        setVis(p => ({ ...p, [s]: p[s].includes(i) ? p[s] : [...p[s], i] }))
      }
      await new Promise(res => setTimeout(res, 400))
      setSesHist(p => [{ w: d.winner }, ...p].slice(0, 30))
      if (!muted && a) { if (d.profit > 0) a.win(); else if (d.profit < 0) a.lose() }
      if (d.profit > 0) addToast(`+$${d.profit.toFixed(2)} 🎉`, 'success')
      getBalance().then(res => setBalance(res.data?.balance ?? 0)).catch(() => {})
      loadHist()
    } catch (e: any) {
      addToast(e.response?.data?.error || e.message || 'Ошибка', 'error')
    } finally { setDealing(false) }
  }

  const pct = (n: number) => sesHist.length ? Math.round(n / sesHist.length * 100) : 0
  const pW = sesHist.filter(h => h.w === 'player').length
  const bW = sesHist.filter(h => h.w === 'banker').length
  const tW = sesHist.filter(h => h.w === 'tie').length

  const winLabel = { player: 'PLAYER WINS', banker: 'BANKER WINS', tie: 'TIE' }

  return (
    <div className="bac">
      <style>{CSS}</style>
      <ToastContainer />

      {/* HEADER */}
      <div className="bac-hdr">
        <button className="bac-btn" style={{ fontSize: 15 }} onClick={() => navigate('/')}>←</button>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.5, flexShrink: 0 }}>🃏 BACCARAT</span>
        <div className="bac-tabs">
          {(['game', 'history', 'fair'] as Tab[]).map(t => (
            <button key={t} className={`bac-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
              {t === 'game' ? 'Игра' : t === 'history' ? 'История' : 'Честность'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setMuted(m => !m)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 15, cursor: 'pointer' }}>{muted ? '🔇' : '🔊'}</button>
        {token && user
          ? <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: '#555', letterSpacing: 0.5 }}>БАЛАНС</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#e4a832' }}>${Number(balance).toFixed(2)}</div>
            </div>
          : <button onClick={() => navigate('/login')} style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#e4a832', color: '#000', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>Войти</button>
        }
      </div>

      {/* SESSION BAR */}
      {tab === 'game' && sesHist.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: '#0e0e0e', borderBottom: '1px solid #181818', flexShrink: 0, overflowX: 'auto' }}>
          <span style={{ fontSize: 8, color: '#333', letterSpacing: 1, flexShrink: 0 }}>СЕССИЯ</span>
          <span style={{ fontSize: 9, color: W.player, flexShrink: 0 }}>P {pct(pW)}%</span>
          <span style={{ fontSize: 9, color: W.banker, flexShrink: 0 }}>B {pct(bW)}%</span>
          <span style={{ fontSize: 9, color: W.tie, flexShrink: 0 }}>T {pct(tW)}%</span>
          <div className="bac-dots">
            {sesHist.slice(0, 25).map((h, i) => (
              <div key={i} className="bac-dot" style={{ background: W[h.w], color: '#000' }}>{h.w[0].toUpperCase()}</div>
            ))}
          </div>
        </div>
      )}

      {/* GAME TAB */}
      {tab === 'game' && (
        <>
          <div className="bac-table">
            {/* BANKER */}
            <div className="bac-zone" style={{ boxShadow: result?.winner === 'banker' ? `0 0 28px ${W.banker}55` : 'none', borderLeft: `3px solid ${result?.winner === 'banker' ? W.banker : '#1e1e1e'}`, transition: 'box-shadow .4s, border-color .4s' }}>
              <div className="bac-zone-hdr">
                <span className="bac-zone-label" style={{ color: W.banker }}>BANKER</span>
                <span className="bac-zone-score" style={{ color: result ? '#fff' : '#1e1e1e' }}>
                  {result ? result.bankerScore : '—'}
                </span>
              </div>
              <div className="bac-cards">
                {result
                  ? result.bankerCards.map((v, i) => <Card key={i} value={v} pos={i} visible={vis.banker.includes(i)} />)
                  : dealing
                    ? [0, 1].map(i => <Card key={i} value={0} pos={i} visible={false} />)
                    : [0, 1].map(i => <div key={i} className="bac-card-slot" style={{ width: 56, height: 80, borderRadius: 8, border: '1px dashed #1e1e1e' }} />)
                }
              </div>
            </div>

            {/* MIDDLE */}
            <div className="bac-mid">
              {result
                ? <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: W[result.winner], letterSpacing: 3 }}>{winLabel[result.winner]}{result.isNatural ? ' ✨' : ''}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2, color: result.profit > 0 ? '#22c55e' : result.profit < 0 ? '#ef4444' : '#888' }}>
                      {result.profit > 0 ? `+$${result.profit.toFixed(2)}` : result.profit < 0 ? `-$${Math.abs(result.profit).toFixed(2)}` : 'PUSH'}
                    </div>
                  </div>
                : dealing
                  ? <div style={{ fontSize: 11, color: '#e4a832', letterSpacing: 2 }}>РАЗДАЧА...</div>
                  : <div style={{ fontSize: 10, color: '#252525', letterSpacing: 2 }}>PLACE YOUR BETS</div>
              }
            </div>

            {/* PLAYER */}
            <div className="bac-zone" style={{ boxShadow: result?.winner === 'player' ? `0 0 28px ${W.player}55` : 'none', borderLeft: `3px solid ${result?.winner === 'player' ? W.player : '#1e1e1e'}`, transition: 'box-shadow .4s, border-color .4s' }}>
              <div className="bac-zone-hdr">
                <span className="bac-zone-label" style={{ color: W.player }}>PLAYER</span>
                <span className="bac-zone-score" style={{ color: result ? '#fff' : '#1e1e1e' }}>
                  {result ? result.playerScore : '—'}
                </span>
              </div>
              <div className="bac-cards">
                {result
                  ? result.playerCards.map((v, i) => <Card key={i} value={v} pos={i + 3} visible={vis.player.includes(i)} />)
                  : dealing
                    ? [0, 1].map(i => <Card key={i} value={0} pos={i + 3} visible={false} />)
                    : [0, 1].map(i => <div key={i} style={{ width: 56, height: 80, borderRadius: 8, border: '1px dashed #1e1e1e' }} />)
                }
              </div>
            </div>
          </div>

          {/* BET PANEL */}
          <div className="bac-panel">
            <div className="bac-sides">
              {(['player', 'banker', 'tie'] as Side[]).map(s => (
                <button key={s} className={`bac-side${side === s ? ' on' : ''}`}
                  style={{ flex: s === 'tie' ? '0 0 70px' : 1, '--c': W[s] } as any}
                  onClick={() => setSide(s)} disabled={dealing}>
                  <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>{s.toUpperCase()}</span>
                  <span style={{ fontSize: 8, color: '#444' }}>{s === 'player' ? '1:1' : s === 'banker' ? '0.95:1' : '8:1'}</span>
                  <span style={{ fontSize: 13, fontWeight: 900, color: bets[s] > 0 ? '#e4a832' : '#333' }}>
                    ${bets[s] > 0 ? bets[s].toFixed(2) : '0'}
                  </span>
                </button>
              ))}
            </div>
            <div className="bac-chips">
              {CHIPS.map(c => (
                <button key={c.v} className="bac-chip" onClick={() => addChip(c.v)} disabled={dealing}
                  style={{ width: 40, height: 40, background: c.bg, border: `3px solid ${c.bd}`, color: c.tx }}>
                  {c.v >= 1000 ? `${c.v / 1000}K` : c.v}
                </button>
              ))}
            </div>
            <div className="bac-actions">
              <button className="bac-act" onClick={clear} disabled={dealing || total === 0} style={{ opacity: total === 0 ? 0.4 : 1 }}>CLEAR</button>
              {(lastBets.player + lastBets.banker + lastBets.tie) > 0 && <>
                <button className="bac-act" onClick={() => rebet()} disabled={dealing}>REBET</button>
                <button className="bac-act" onClick={() => rebet(2)} disabled={dealing}>×2</button>
              </>}
              <button className="bac-deal" onClick={deal} disabled={dealing || total === 0 || !token}
                style={{ background: dealing || total === 0 || !token ? '#252525' : 'linear-gradient(135deg,#e4a832,#c88c1a)', color: dealing || total === 0 || !token ? '#555' : '#000' }}>
                {dealing ? '...' : !token ? 'ВОЙТИ' : total === 0 ? 'DEAL' : `DEAL  $${total.toFixed(2)}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
          {history.length === 0
            ? <div style={{ textAlign: 'center', color: '#333', fontSize: 13, marginTop: 40 }}>Нет истории</div>
            : history.map(h => (
                <div key={h.id} className="bac-hist-row" style={{ borderLeft: `3px solid ${W[h.winner]}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${W[h.winner]}22`, border: `2px solid ${W[h.winner]}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: W[h.winner] }}>
                      {h.winner[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: W[h.winner] }}>{h.winner === 'player' ? 'Player' : h.winner === 'banker' ? 'Banker' : 'Tie'}</div>
                      <div style={{ fontSize: 9, color: '#444' }}>{h.player_score} : {h.banker_score}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: h.profit > 0 ? '#22c55e' : h.profit < 0 ? '#ef4444' : '#888' }}>
                      {h.profit > 0 ? `+$${Number(h.profit).toFixed(2)}` : h.profit < 0 ? `-$${Math.abs(Number(h.profit)).toFixed(2)}` : 'PUSH'}
                    </div>
                    <div style={{ fontSize: 9, color: '#444' }}>Ставка ${Number(h.total_bet).toFixed(2)}</div>
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {/* FAIR TAB */}
      {tab === 'fair' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          <div style={{ maxWidth: 460, margin: '0 auto' }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#e4a832', marginBottom: 12 }}>🛡 Provably Fair</div>
            <div style={{ fontSize: 11, color: '#444', lineHeight: 1.6, marginBottom: 14 }}>
              Каждый раунд генерируется через HMAC-SHA256. Хеш серверного сида показывается заранее.
            </div>
            {result && [
              ['SERVER SEED', result.provablyFair.serverSeed],
              ['HASH (SHA-256)', result.provablyFair.serverSeedHash],
              ['CLIENT SEED', result.provablyFair.clientSeed],
              ['NONCE', String(result.provablyFair.nonce)],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 9, color: '#555', letterSpacing: 1 }}>{lbl}</div>
                <div className="bac-fair-field">{val}</div>
              </div>
            ))}
            {!result && <div style={{ fontSize: 11, color: '#333', marginBottom: 14 }}>Сыграйте раунд чтобы увидеть данные</div>}
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: 1, marginBottom: 4 }}>СВОЙ CLIENT SEED</div>
              <input value={customSeed} onChange={e => setCustomSeed(e.target.value)} placeholder="Введите свой seed..."
                style={{ width: '100%', boxSizing: 'border-box', background: '#161616', border: '1px solid #252525', borderRadius: 7, padding: '8px 10px', color: '#fff', fontSize: 11, outline: 'none' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
