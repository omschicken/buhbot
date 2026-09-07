// v2
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import { getBalance } from '../../api/wallet'

const RUGPULL_WS_URL = import.meta.env.VITE_RUGPULL_WS_URL || 'wss://rugpull-game-production.up.railway.app/rugpull'

type GameStatus = 'waiting' | 'betting' | 'running' | 'pulled'
type Tab = 'game' | 'fair'

interface PlayerBet {
  username: string
  amount: number
  cashedOut: boolean
  cashoutAt?: number
  cashoutOrder?: number
}

interface HistoryRound {
  id: string
  rug_point: string
}

interface BonusWinner {
  username: string
  cashoutAt: number
  bonus: number
}

const rpColor = (x: number) => x >= 5 ? '#22c55e' : x >= 2 ? '#f59e0b' : '#ef4444'

interface Pt { t: number; m: number }

export default function RugPull() {
  const navigate = useNavigate()
  const { token, user, balance, setBalance } = useAuthStore()
  const { addToast } = useUIStore()
  const [tab, setTab] = useState<Tab>('game')
  const [showHelp, setShowHelp] = useState(false)

  // Game state
  const [status, setStatus] = useState<GameStatus>('waiting')
  const [multiplier, setMultiplier] = useState(1.00)
  const [totalPool, setTotalPool] = useState(0)
  const [playersCount, setPlayersCount] = useState(0)
  const [bets, setBets] = useState<PlayerBet[]>([])
  const [bettingCountdown, setBettingCountdown] = useState(30)
  const [roundNumber, setRoundNumber] = useState(0)
  const [lastRoundData, setLastRoundData] = useState<any>(null)
  const [isPulled, setIsPulled] = useState(false)

  // Player state
  const [myBet, setMyBet] = useState<number | null>(null)
  const [myCashoutAt, setMyCashoutAt] = useState<number | null>(null)
  const [myPayout, setMyPayout] = useState<number | null>(null)
  const [myCashoutOrder, setMyCashoutOrder] = useState<number | null>(null)
  const [myBonus, setMyBonus] = useState<number | null>(null)
  const [didLose, setDidLose] = useState(false)

  // Input
  const [betInput, setBetInput] = useState('10')
  const [autoCashoutInput, setAutoCashoutInput] = useState('')
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false)
  const [history, setHistory] = useState<HistoryRound[]>([])

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphContainerRef = useRef<HTMLDivElement>(null)
  const ptsRef = useRef<Pt[]>([])
  const maxMRef = useRef(2)
  const isPulledRef = useRef(false)
  const statusRef = useRef<GameStatus>('waiting')
  const startTimeRef = useRef(0)

  // WS
  const wsRef = useRef<WebSocket | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!token) return
    getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})
  }, [token])

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr
    ctx.clearRect(0, 0, W, H)

    const PAD_L = 8, PAD_B = 8, PAD_T = 16, PAD_R = 24
    const gW = W - PAD_L - PAD_R
    const gH = H - PAD_T - PAD_B

    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath(); ctx.moveTo(PAD_L, PAD_T + gH * i / 4)
      ctx.lineTo(W - PAD_R, PAD_T + gH * i / 4); ctx.stroke()
    }
    for (let i = 1; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo(PAD_L + gW * i / 6, PAD_T)
      ctx.lineTo(PAD_L + gW * i / 6, H - PAD_B); ctx.stroke()
    }

    const pts = ptsRef.current
    if (pts.length < 2) return

    const pulled = isPulledRef.current
    const color = pulled ? '#ef4444' : '#f59e0b'
    const maxT = pts[pts.length - 1].t / 0.75
    const maxM = maxMRef.current
    const logMax = Math.log(Math.max(maxM, 1.01))
    const toX = (t: number) => PAD_L + Math.min(gW, (t / maxT) * gW)
    const toY = (m: number) => {
      const logRatio = Math.log(Math.max(m, 1.001)) / logMax
      return PAD_T + gH - Math.min(gH, logRatio * gH)
    }
    const mapped = pts.map(p => ({ x: toX(p.t), y: Math.max(PAD_T, toY(p.m)) }))

    ctx.save()
    ctx.shadowColor = color; ctx.shadowBlur = 18
    ctx.beginPath(); ctx.moveTo(mapped[0].x, mapped[0].y)
    for (let i = 1; i < mapped.length; i++) ctx.lineTo(mapped[i].x, mapped[i].y)
    ctx.strokeStyle = color; ctx.lineWidth = 3
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
    ctx.restore()

    ctx.beginPath(); ctx.moveTo(mapped[0].x, mapped[0].y)
    for (let i = 1; i < mapped.length; i++) ctx.lineTo(mapped[i].x, mapped[i].y)
    ctx.lineTo(mapped[mapped.length - 1].x, H - PAD_B)
    ctx.lineTo(mapped[0].x, H - PAD_B); ctx.closePath()
    const g = ctx.createLinearGradient(0, PAD_T, 0, H - PAD_B)
    g.addColorStop(0, pulled ? 'rgba(239,68,68,0.22)' : 'rgba(245,158,11,0.18)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fill()

    const tip = mapped[mapped.length - 1]
    ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 24
    ctx.beginPath(); ctx.arc(tip.x, tip.y, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore()
  }, [])

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = graphContainerRef.current
    if (!canvas || !container) return
    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    const w = Math.floor(rect.width), h = Math.floor(rect.height)
    if (!w || !h) return
    canvas.width = w * dpr; canvas.height = h * dpr
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
    canvas.getContext('2d')!.scale(dpr, dpr)
  }, [])

  useEffect(() => {
    const container = graphContainerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => { initCanvas(); drawGraph() })
    ro.observe(container)
    let raf2: number
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => { initCanvas(); drawGraph() })
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); ro.disconnect() }
  }, [initCanvas, drawGraph])

  // Rebuild graph points if joining mid-round
  useEffect(() => {
    if (status !== 'running' || !startTimeRef.current || ptsRef.current.length > 0) return
    const elapsed = (Date.now() - startTimeRef.current) / 1000
    for (let t = 0.5; t <= elapsed; t += 0.5) {
      const m = Math.max(1.001, Math.pow(Math.E, 0.06 * t))
      if (m * 1.4 > maxMRef.current) maxMRef.current = m * 1.4
      ptsRef.current.push({ t, m })
    }
    drawGraph()
  }, [status, drawGraph])

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const url = token ? `${RUGPULL_WS_URL}?token=${token}` : RUGPULL_WS_URL
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      if (msg.type === 'init') {
        const s = msg.state
        setStatus(s.status); statusRef.current = s.status
        setMultiplier(s.multiplier)
        setTotalPool(s.totalPool)
        setPlayersCount(s.playersCount)
        setBets(s.bets || [])
        if (s.status === 'betting') setBettingCountdown(30)
      }

      if (msg.type === 'round_start') {
        setStatus('betting'); statusRef.current = 'betting'
        setRoundNumber(msg.roundNumber)
        setBettingCountdown(30)
        setMultiplier(1.00)
        setTotalPool(0); setPlayersCount(0)
        setBets([]); ptsRef.current = []
        maxMRef.current = 2
        isPulledRef.current = false; setIsPulled(false)
        setMyBet(null); setMyCashoutAt(null); setMyPayout(null)
        setMyCashoutOrder(null); setMyBonus(null); setDidLose(false)
        setLastRoundData(null)

        if (countdownRef.current) clearInterval(countdownRef.current)
        let cd = 30
        countdownRef.current = setInterval(() => {
          cd -= 1; setBettingCountdown(cd)
          if (cd <= 0 && countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
        }, 1000)
      }

      if (msg.type === 'round_running') {
        setStatus('running'); statusRef.current = 'running'
        startTimeRef.current = Date.now()
        setTotalPool(msg.totalPool); setPlayersCount(msg.playersCount)
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
      }

      if (msg.type === 'tick') {
        setMultiplier(msg.multiplier)
        const elapsed = msg.elapsed / 1000
        const m = Math.max(1.001, msg.multiplier)
        if (m * 1.4 > maxMRef.current) maxMRef.current = m * 1.4
        ptsRef.current.push({ t: elapsed, m })
        drawGraph()
      }

      if (msg.type === 'pulled') {
        setStatus('pulled'); statusRef.current = 'pulled'
        isPulledRef.current = true; setIsPulled(true)
        setLastRoundData(msg)
        setMultiplier(msg.rugPoint)
        drawGraph()
        getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})

        if (user?.username && msg.losers?.includes(user.username)) setDidLose(true)
        if (user?.id && msg.bonusPayouts?.[user.id]) setMyBonus(msg.bonusPayouts[user.id])

        setHistory(prev => [{
          id: msg.roundId,
          rug_point: parseFloat(msg.rugPoint).toFixed(2)
        }, ...prev.slice(0, 19)])
      }

      if (msg.type === 'bet_placed') {
        setTotalPool(msg.totalPool); setPlayersCount(msg.playersCount)
        setBets(prev => prev.find(b => b.username === msg.username) ? prev
          : [...prev, { username: msg.username, amount: msg.amount, cashedOut: false }])
      }

      if (msg.type === 'bet_accepted') {
        setMyBet(msg.amount)
        addToast('Ставка принята!', 'success')
      }

      if (msg.type === 'cashout') {
        setBets(prev => prev.map(b => b.username === msg.username
          ? { ...b, cashedOut: true, cashoutAt: msg.multiplier, cashoutOrder: msg.cashoutOrder }
          : b))
        if (msg.userId === user?.id) {
          setMyCashoutAt(msg.multiplier); setMyPayout(msg.basePayout)
          setMyCashoutOrder(msg.cashoutOrder)
        }
      }

      if (msg.type === 'cashout_confirmed') {
        setMyPayout(msg.payout)
        addToast(`Вышел! +$${msg.payout.toFixed(2)}`, 'success')
      }

      if (msg.type === 'pool_update') {
        setTotalPool(msg.totalPool); setPlayersCount(msg.playersCount)
      }

      if (msg.type === 'error') {
        addToast(msg.message, 'error')
      }

      if (msg.type === 'round_cancelled') {
        setStatus('waiting'); statusRef.current = 'waiting'
        addToast('Раунд отменён: мало игроков', 'error')
      }
    }

    ws.onclose = () => { setTimeout(connectWS, 2000) }
    ws.onerror = () => ws.close()
  }, [token, user, drawGraph, addToast, setBalance])

  useEffect(() => {
    connectWS()
    return () => {
      wsRef.current?.close()
      if (countdownRef.current) clearInterval(countdownRef.current)
      cancelAnimationFrame(rafRef.current)
    }
  }, [connectWS])

  const placeBet = () => {
    const amount = parseFloat(betInput)
    if (isNaN(amount) || amount <= 0) return
    if (status !== 'betting' || myBet !== null) return
    if (!token) { navigate('/login'); return }
    const ac = autoCashoutEnabled && autoCashoutInput ? parseFloat(autoCashoutInput) : undefined
    wsRef.current?.send(JSON.stringify({ type: 'bet', amount, autoCashout: ac }))
  }

  const doCashout = () => {
    if (status !== 'running' || myCashoutAt !== null) return
    wsRef.current?.send(JSON.stringify({ type: 'cashout' }))
  }

  const isBetting = status === 'betting'
  const isRunning = status === 'running'
  const mulColor = isPulled ? '#ef4444' : '#f59e0b'
  const mulDisplay = multiplier

  const lastThreeOut = [...bets]
    .filter(b => b.cashedOut)
    .sort((a, b) => (b.cashoutOrder || 0) - (a.cashoutOrder || 0))
    .slice(0, 3)

  return (
    <div style={{ minHeight: '100vh', background: '#0d0d0d', color: '#fff', fontFamily: 'system-ui,sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 48, background: '#111', borderBottom: '1px solid #1e1e1e', flexShrink: 0, minWidth: 0 }}>
        <button onClick={() => navigate('/')}
          style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, color: '#aaa', fontSize: 15, cursor: 'pointer', padding: '5px 9px', lineHeight: 1, flexShrink: 0 }}>
          ←
        </button>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: 0.5, flexShrink: 0 }}>🪤 RUG PULL</span>

        <div style={{ display: 'flex', background: '#161616', borderRadius: 7, padding: 2, overflow: 'hidden', flexShrink: 0 }}>
          {([['game', 'Игра'], ['fair', 'Честность']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '5px 9px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                       background: tab === t ? '#252525' : 'none', color: tab === t ? '#fff' : '#555' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {token && user ? (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 8, color: '#555', letterSpacing: 0.5 }}>БАЛАНС</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#f59e0b' }}>${Number(balance).toFixed(2)}</div>
          </div>
        ) : (
          <button onClick={() => navigate('/login')}
            style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#f59e0b', color: '#000', fontSize: 11, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
            Войти
          </button>
        )}

        <button onClick={() => setShowHelp(true)}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7, color: '#888', fontSize: 14, cursor: 'pointer', padding: '5px 8px', lineHeight: 1, flexShrink: 0 }}>
          ?
        </button>
      </div>

      {/* Game tab */}
      {tab === 'game' && (
        <>
          {/* History bar */}
          <div style={{ display: 'flex', gap: 5, padding: '6px 10px', background: '#0e0e0e', borderBottom: '1px solid #181818', overflowX: 'auto', flexShrink: 0, alignItems: 'center' }}>
            <span style={{ fontSize: 8, color: '#444', letterSpacing: 1, flexShrink: 0 }}>ИСТОРИЯ</span>
            {history.map((h, i) => (
              <span key={h.id + i}
                style={{ padding: '2px 9px', borderRadius: 20, border: `1px solid ${rpColor(parseFloat(h.rug_point))}44`,
                         fontSize: 11, fontWeight: 800, background: `${rpColor(parseFloat(h.rug_point))}18`,
                         color: rpColor(parseFloat(h.rug_point)), flexShrink: 0 }}>
                {h.rug_point}x
              </span>
            ))}
          </div>

          {/* Main area */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* Graph */}
            <div ref={graphContainerRef} style={{ flex: 1, position: 'relative', background: '#0d0d0d', overflow: 'hidden', minHeight: 260 }}>
              <div style={{ position: 'absolute', top: 8, left: 10, fontSize: 9, color: '#2a2a2a', zIndex: 2, letterSpacing: 0.5 }}>
                ROUND #{roundNumber} · 💰 ${totalPool.toFixed(2)} POOL
              </div>

              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
                {isBetting ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#666', marginBottom: 6, letterSpacing: 2 }}>ПРИЁМ СТАВОК</div>
                    <div style={{ fontSize: 76, fontWeight: 900, color: '#f59e0b', lineHeight: 1, textShadow: '0 0 40px #f59e0b60' }}>{bettingCountdown}</div>
                    <div style={{ fontSize: 9, color: '#555', marginTop: 4, letterSpacing: 1 }}>сек · {playersCount} игроков</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1, color: mulColor, textShadow: `0 0 50px ${mulColor}50`, fontVariantNumeric: 'tabular-nums' }}>
                      {mulDisplay.toFixed(2)}x
                    </div>
                    {isPulled && <div style={{ fontSize: 13, fontWeight: 800, color: '#ef4444', marginTop: 8, letterSpacing: 3 }}>🪤 RUG PULL</div>}
                  </div>
                )}
              </div>

              {/* Rug pull bonus overlay */}
              {isPulled && lastRoundData?.lastThreeOut?.length > 0 && (
                <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 3,
                               background: 'rgba(0,0,0,0.85)', border: '1px solid #f59e0b44', borderRadius: 10,
                               padding: '8px 16px', textAlign: 'center', minWidth: 200 }}>
                  <div style={{ fontSize: 9, color: '#f59e0b', letterSpacing: 1, marginBottom: 4 }}>БОНУС ПОСЛЕДНИМ</div>
                  {lastRoundData.lastThreeOut.map((w: BonusWinner, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: '#ddd' }}>
                      {['🏆', '🥈', '🥉'][i]} <b>{w.username}</b> +${w.bonus.toFixed(2)}
                    </div>
                  ))}
                </div>
              )}

              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />
            </div>

            {/* Sidebar */}
            <div style={{ width: 180, background: '#111', borderLeft: '1px solid #1e1e1e', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 12px 6px', borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ fontSize: 9, color: '#666', letterSpacing: 1, fontWeight: 700, marginBottom: 4 }}>ИГРОКИ {bets.length > 0 && <span style={{ background: '#1e1e1e', color: '#777', borderRadius: 10, padding: '1px 6px' }}>{bets.length}</span>}</div>
                <div style={{ background: '#161616', borderRadius: 6, padding: '6px 8px', fontSize: 10 }}>
                  <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: 2 }}>LAST OUT BONUS</div>
                  <div style={{ color: '#666' }}>🏆 50% · 🥈 30% · 🥉 20%</div>
                  <div style={{ color: '#555', fontSize: 9, marginTop: 2 }}>от потерянного пула</div>
                </div>
              </div>

              {bets.length === 0
                ? <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '24px 0' }}>Нет ставок</div>
                : [...bets].sort((a, b) => (b.cashoutOrder || 0) - (a.cashoutOrder || 0)).map((b, i) => {
                  const rank = lastThreeOut.findIndex(x => x.username === b.username)
                  const medal = ['🏆', '🥈', '🥉'][rank] ?? ''
                  const won = b.cashedOut
                  const lost = isPulled && !b.cashedOut
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #161616', background: won ? '#f59e0b08' : lost ? '#ef444408' : 'transparent' }}>
                      <span style={{ fontSize: 11, color: won ? '#f59e0b' : lost ? '#555' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 95, fontWeight: won ? 700 : 400 }}>
                        {medal} {b.username}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 11, color: won ? '#f59e0b' : lost ? '#444' : '#777' }}>
                        {won ? `${b.cashoutAt?.toFixed(2)}x` : `$${b.amount}`}
                      </span>
                    </div>
                  )
                })
              }
            </div>
          </div>

          {/* Bet panel */}
          <div style={{ background: '#111', borderTop: '1px solid #1e1e1e', padding: '8px 10px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: '0 0 auto', minWidth: 220, maxWidth: 320, background: '#161616', borderRadius: 10, border: '1px solid #222', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: 8, color: '#555', letterSpacing: 1, fontWeight: 700 }}>СТАВКА ($)</div>

                <div style={{ display: 'flex', gap: 3 }}>
                  <input value={betInput} onChange={e => setBetInput(e.target.value)}
                    type="number" min="0.1" disabled={myBet !== null}
                    style={{ flex: 1, minWidth: 0, background: '#1a1a1a', border: '1px solid #252525', borderRadius: 6, padding: '7px 8px', color: '#fff', fontSize: 14, fontWeight: 900, outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
                  {[10, 50, 100].map(v => (
                    <button key={v} onClick={() => setBetInput(String(v))} disabled={myBet !== null}
                      style={{ padding: '7px 6px', borderRadius: 5, border: '1px solid #252525', background: '#1e1e1e', color: '#666', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      {v}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input type="checkbox" id="ac" checked={autoCashoutEnabled} onChange={e => setAutoCashoutEnabled(e.target.checked)} disabled={myBet !== null} style={{ cursor: 'pointer', accentColor: '#f59e0b' }} />
                  <label htmlFor="ac" style={{ fontSize: 8, color: autoCashoutEnabled ? '#aaa' : '#444', cursor: 'pointer', fontWeight: 700, letterSpacing: 0.5 }}>АВТО</label>
                  <input value={autoCashoutInput} onChange={e => setAutoCashoutInput(e.target.value)}
                    type="number" min="1.01" step="0.01" placeholder="2.00"
                    disabled={!autoCashoutEnabled || myBet !== null}
                    style={{ flex: 1, minWidth: 0, background: '#1a1a1a', border: `1px solid ${autoCashoutEnabled ? '#252525' : '#1a1a1a'}`, borderRadius: 6, padding: '5px 7px', color: autoCashoutEnabled ? '#fff' : '#2a2a2a', fontSize: 11, outline: 'none' }} />
                </div>

                {isRunning && myBet !== null && myCashoutAt === null ? (
                  <button onClick={doCashout}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 900, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#000', animation: 'pulse 0.7s infinite' }}>
                    КЕШАУТ {multiplier.toFixed(2)}x · ${(myBet * multiplier * 0.95).toFixed(2)}
                  </button>
                ) : myCashoutAt !== null ? (
                  <div style={{ background: '#f59e0b12', border: '1px solid #f59e0b40', borderRadius: 8, padding: '9px', textAlign: 'center' }}>
                    <div style={{ fontSize: 8, color: '#f59e0b', letterSpacing: 1 }}>ВЫШЕЛ {myCashoutAt.toFixed(2)}x</div>
                    <div style={{ color: '#f59e0b', fontWeight: 900, fontSize: 16 }}>+${myPayout?.toFixed(2)}</div>
                    {myCashoutOrder !== null && !isPulled && (
                      <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>#{myCashoutOrder} — держись для бонуса! 🎯</div>
                    )}
                    {myBonus !== null && myBonus > 0 && (
                      <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, marginTop: 4 }}>🏆 +${myBonus.toFixed(2)} бонус!</div>
                    )}
                  </div>
                ) : isPulled && didLose ? (
                  <div style={{ background: '#ef444412', border: '1px solid #ef444440', borderRadius: 8, padding: '9px', textAlign: 'center' }}>
                    <div style={{ color: '#ef4444', fontWeight: 900 }}>🪤 Rug pulled — потерял</div>
                  </div>
                ) : (
                  <button onClick={placeBet} disabled={!isBetting || myBet !== null}
                    style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 900, transition: 'all 0.15s',
                      cursor: isBetting && !myBet ? 'pointer' : 'default',
                      background: isBetting && !myBet ? 'linear-gradient(135deg,#f59e0b,#d97706)' : '#1a1a1a',
                      color: isBetting && !myBet ? '#000' : '#333' }}>
                    {!token ? 'ВОЙДИ' : myBet !== null ? `✓ В ИГРЕ $${myBet}` : isBetting ? `JOIN $${betInput}` : isRunning ? 'РАУНД ИДЁТ' : '...'}
                  </button>
                )}
              </div>

              {/* Pool info */}
              <div style={{ flex: '0 0 auto', minWidth: 160, background: '#161616', borderRadius: 10, border: '1px solid #222', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
                <div>
                  <div style={{ fontSize: 8, color: '#555', letterSpacing: 1 }}>💰 ПУЛ</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#f59e0b' }}>${totalPool.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 8, color: '#555', letterSpacing: 1 }}>ИГРОКОВ</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#ccc' }}>{playersCount}</div>
                </div>
                {lastRoundData && (
                  <div style={{ borderTop: '1px solid #222', paddingTop: 6 }}>
                    <div style={{ fontSize: 8, color: '#555' }}>ПОСЛЕДНИЙ RUG</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: rpColor(lastRoundData.rugPoint) }}>{parseFloat(lastRoundData.rugPoint).toFixed(2)}x</div>
                    <div style={{ fontSize: 10, color: '#555' }}>Потеряли: ${parseFloat(lastRoundData.lostPool || 0).toFixed(2)}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Fair tab */}
      {tab === 'fair' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 }}>🔒 Provably Fair</div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7, marginBottom: 16 }}>
            Точка Rug Pull генерируется через HMAC-SHA256(serverSeed, clientSeed).<br />
            Хэш публикуется <b style={{ color: '#aaa' }}>до</b> раунда, сид раскрывается <b style={{ color: '#aaa' }}>после</b>.
          </div>
          <div style={{ padding: 14, background: '#111', borderRadius: 10, border: '1px solid #1e1e1e', fontFamily: 'monospace', fontSize: 11, color: '#666' }}>
            h = HMAC-SHA256(serverSeed, clientSeed)<br />
            rugPoint = floor((100×2³² - h) / (2³² - h) × 0.95) / 100<br />
            5% шанс мгновенного rug (h % 20 === 0)
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: '#555' }}>
            Верификация: <code style={{ color: '#f59e0b' }}>GET /api/rugpull/verify/:roundId</code>
          </div>
        </div>
      )}

      {/* Help modal */}
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowHelp(false)}>
          <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 16, padding: 28, maxWidth: 400, width: '90%' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#f59e0b', marginTop: 0 }}>🪤 Rug Pull — Правила</h3>
            <ul style={{ color: '#bbb', fontSize: 13, lineHeight: 1.8, paddingLeft: 20 }}>
              <li><b>30 сек приём ставок</b> — вступай в общий пул</li>
              <li>Множитель растёт — выходи когда хочешь</li>
              <li>В случайный момент — <b style={{ color: '#ef4444' }}>RUG PULL!</b></li>
              <li>Не вышедшие теряют ставки</li>
              <li>Последние 3 кто вышел получают бонус из потерянного пула:</li>
              <li style={{ listStyle: 'none' }}>🏆 1-й последний = 50%&nbsp;&nbsp;🥈 = 30%&nbsp;&nbsp;🥉 = 20%</li>
              <li>Казино берёт 5% от всего пула</li>
              <li>Минимум 2 игрока для старта</li>
            </ul>
            <div style={{ color: '#f59e0b', fontSize: 13, marginTop: 8, background: '#1a1400', borderRadius: 8, padding: '8px 12px' }}>
              💡 Держись дольше всех — получишь деньги проигравших!
            </div>
            <button onClick={() => setShowHelp(false)}
              style={{ marginTop: 16, width: '100%', padding: 10, background: '#f59e0b', border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              Понятно
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.015)} }
      `}</style>
    </div>
  )
}
