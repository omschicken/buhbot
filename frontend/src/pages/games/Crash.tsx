import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import ToastContainer from '../../components/ui/Toast'

const CRASH_WS_URL = import.meta.env.VITE_CRASH_WS_URL || 'wss://buhbot-production-ddcd.up.railway.app/crash'

type GameStatus = 'waiting' | 'betting' | 'running' | 'crashed'
type Tab = 'game' | 'my-bets' | 'fair'

interface BetEntry { username: string; amount: number; cashedOut: boolean; cashoutAt?: number }
interface HistoryEntry { id: string; round_number: number; crash_point: number; server_seed_hash: string; client_seed: string }
interface GameState {
  roundId: string | null; roundNumber: number; status: GameStatus; multiplier: number
  serverSeedHash: string; clientSeed: string; bettingEndsAt: number; startTime: number; bets: BetEntry[]
}

const cpColor = (x: number) => x < 2 ? '#ef4444' : x < 5 ? '#f59e0b' : '#22c55e'

export default function CrashGame() {
  const { token, user, balance } = useAuthStore()
  const { addToast } = useUIStore()
  const navigate = useNavigate()
  const [fullscreen, setFullscreen] = useState(false)
  const [tab, setTab] = useState<Tab>('game')

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

  const wsRef = useRef<WebSocket | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef<{ x: number; y: number }[]>([])
  const stateRef = useRef<GameState>({
    roundId: null, roundNumber: 0, status: 'waiting', multiplier: 1,
    serverSeedHash: '', clientSeed: '', bettingEndsAt: 0, startTime: 0, bets: []
  })

  const [state, setState] = useState<GameState>(stateRef.current)
  const [betAmount, setBetAmount] = useState('10')
  const [autoCashout, setAutoCashout] = useState('')
  const [useAutoCashout, setUseAutoCashout] = useState(false)
  const [hasBet, setHasBet] = useState(false)
  const [cashedOut, setCashedOut] = useState(false)
  const [myProfit, setMyProfit] = useState<number | null>(null)
  const [bettingCountdown, setBettingCountdown] = useState(10)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [verifyModal, setVerifyModal] = useState<HistoryEntry | null>(null)
  const [verifyData, setVerifyData] = useState<any>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [crashed, setCrashed] = useState(false)
  const [crashedAt, setCrashedAt] = useState(1)

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr
    ctx.clearRect(0, 0, W, H)

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 5; i++) {
      const y = H * i / 5
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }
    for (let i = 1; i <= 8; i++) {
      const x = W * i / 8
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }

    const pts = pointsRef.current
    if (pts.length < 2) return

    const isCrashed = stateRef.current.status === 'crashed'
    const color = isCrashed ? '#ef4444' : '#00e676'

    // Glow pass
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()

    // Fill
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.lineTo(pts[pts.length - 1].x, H)
    ctx.lineTo(pts[0].x, H)
    ctx.closePath()
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, isCrashed ? 'rgba(239,68,68,0.18)' : 'rgba(0,230,118,0.15)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fill()
    ctx.restore()

    // Tip dot
    const tip = pts[pts.length - 1]
    ctx.save()
    ctx.shadowColor = color
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(tip.x, tip.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.restore()
  }, [])

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.getContext('2d')!.scale(dpr, dpr)
  }, [])

  const updateCanvas = useCallback((multiplier: number, startTime: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const W = canvas.width / dpr
    const H = canvas.height / dpr
    const elapsed = (Date.now() - startTime) / 1000

    // x: grows with time, starts at left edge
    const x = Math.min(W - 16, 16 + (elapsed / 60) * (W - 32))

    // y: dynamic log scale — current multiplier fills ~75% of graph height
    const logM = Math.log(Math.max(1.001, multiplier))
    const maxLog = Math.max(logM * 1.35, Math.log(2)) // always show at least 2x range
    const y = H - 8 - ((logM / maxLog) * (H - 24))

    // Rescale all existing points when scale changes
    const pts = pointsRef.current
    if (pts.length > 0) {
      const prevMaxLog = pts[pts.length - 1]._maxLog ?? maxLog
      if (Math.abs(prevMaxLog - maxLog) > 0.01) {
        for (const p of pts) {
          const origLogM = p._logM ?? 0
          p.y = H - 8 - ((origLogM / maxLog) * (H - 24))
        }
      }
    }

    const pt: any = { x, y: Math.max(8, y), _logM: logM, _maxLog: maxLog }
    pointsRef.current.push(pt)
    drawGraph()
  }, [drawGraph])

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/crash/history`)
      const d = await r.json()
      setHistory((d.data || []).slice(0, 10))
    } catch { }
  }, [])

  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    initCanvas()
    const onResize = () => { initCanvas(); pointsRef.current = []; drawGraph() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [initCanvas, drawGraph])

  useEffect(() => {
    const url = token ? `${CRASH_WS_URL}?token=${token}` : CRASH_WS_URL
    const ws = new WebSocket(url)
    wsRef.current = ws
    ws.onopen = () => setWsConnected(true)
    ws.onclose = () => setWsConnected(false)
    ws.onerror = () => setWsConnected(false)
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'init') {
        stateRef.current = msg.state as GameState
        setState(msg.state as GameState)
      }
      if (msg.type === 'round_start') {
        pointsRef.current = []
        setCrashed(false); setCrashedAt(1); setHasBet(false); setCashedOut(false); setMyProfit(null)
        const s = { ...stateRef.current, roundId: msg.roundId, roundNumber: msg.roundNumber, serverSeedHash: msg.serverSeedHash, clientSeed: msg.clientSeed, status: 'betting' as GameStatus, multiplier: 1, bettingEndsAt: msg.bettingEndsAt, bets: [] }
        stateRef.current = s; setState(s)
      }
      if (msg.type === 'round_running') {
        pointsRef.current = []
        setState(prev => { const s = { ...prev, status: 'running' as GameStatus, startTime: msg.startTime, multiplier: 1 }; stateRef.current = s; return s })
      }
      if (msg.type === 'tick') {
        setState(prev => { updateCanvas(msg.multiplier, prev.startTime); const s = { ...prev, multiplier: msg.multiplier, status: 'running' as GameStatus }; stateRef.current = s; return s })
      }
      if (msg.type === 'crashed') {
        setCrashed(true); setCrashedAt(msg.crashPoint)
        setState(prev => { const s = { ...prev, status: 'crashed' as GameStatus, multiplier: msg.crashPoint }; stateRef.current = s; return s })
        setTimeout(drawGraph, 50); loadHistory()
      }
      if (msg.type === 'bet_placed') {
        setState(prev => ({ ...prev, bets: [...prev.bets.filter(b => b.username !== msg.username), { username: msg.username, amount: msg.amount, cashedOut: false }] }))
      }
      if (msg.type === 'cashout') {
        setState(prev => ({ ...prev, bets: prev.bets.map(b => b.username === msg.username ? { ...b, cashedOut: true, cashoutAt: msg.multiplier } : b) }))
      }
      if (msg.type === 'bet_accepted') { setHasBet(true); addToast(`Ставка $${msg.amount} принята`, 'success') }
      if (msg.type === 'cashout_confirmed') { setCashedOut(true); setMyProfit(msg.profit); addToast(`Вывод: $${Number(msg.profit).toFixed(2)}`, 'success') }
      if (msg.type === 'error') { addToast(msg.message, 'error') }
    }
    return () => ws.close()
  }, [token])

  useEffect(() => {
    if (state.status !== 'betting') return
    const iv = setInterval(() => setBettingCountdown(Math.max(0, Math.ceil((state.bettingEndsAt - Date.now()) / 1000))), 100)
    return () => clearInterval(iv)
  }, [state.status, state.bettingEndsAt])

  const sendBet = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    const amount = parseFloat(betAmount)
    if (!amount || amount <= 0) { addToast('Введи сумму ставки', 'error'); return }
    wsRef.current.send(JSON.stringify({ type: 'bet', amount, autoCashout: useAutoCashout && autoCashout ? parseFloat(autoCashout) : undefined }))
  }

  const sendCashout = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'cashout' }))
  }

  const verifyRound = async (r: HistoryEntry) => {
    setVerifyModal(r); setVerifyData(null); setTab('fair')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/crash/verify/${r.id}`)
      setVerifyData((await res.json()).data)
    } catch { setVerifyData({ error: 'Ошибка загрузки' }) }
  }

  const mulDisplay = crashed ? crashedAt : state.multiplier
  const isRunning = state.status === 'running'
  const isBetting = state.status === 'betting'
  const isCrashed = state.status === 'crashed'
  const mulColor = isCrashed ? '#ef4444' : '#00e676'

  if (!wsConnected) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0d0d', color: '#fff', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🚀</div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>CRASH</div>
      <div style={{ width: 32, height: 32, border: '3px solid #1e1e1e', borderTopColor: '#e4a832', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 12, color: '#444' }}>Подключение к серверу...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>
      <ToastContainer />

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 50, background: '#111', borderBottom: '1px solid #1e1e1e', flexShrink: 0 }}>
        <button onClick={() => navigate('/')}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, color: '#aaa', fontSize: 16, cursor: 'pointer', padding: '6px 10px', lineHeight: 1, display: 'flex', alignItems: 'center' }}>
          ←
        </button>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>🚀 CRASH</span>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 8, background: '#161616', borderRadius: 8, padding: 3 }}>
          {([['game', 'Игра'], ['my-bets', 'Мои ставки'], ['fair', 'Честность']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '5px 12px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                background: tab === t ? '#252525' : 'none',
                color: tab === t ? '#fff' : '#555' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {token && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: '#555', letterSpacing: 0.5 }}>БАЛАНС</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#e4a832' }}>${Number(balance).toFixed(2)}</div>
            </div>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e1e1e', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#aaa' }}>
              {(user as any).username?.[0]?.toUpperCase() || '?'}
            </div>
          </div>
        ) : (
          <button onClick={() => navigate('/login')}
            style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: '#e4a832', color: '#000', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            Войти
          </button>
        )}

        {/* Fullscreen button */}
        <button onClick={toggleFullscreen} title={fullscreen ? 'Выйти из полноэкранного' : 'Полный экран'}
          style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: '#aaa', fontSize: 16, cursor: 'pointer', padding: '6px 10px', lineHeight: 1, transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#555'; (e.currentTarget as HTMLButtonElement).style.color = '#fff' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#333'; (e.currentTarget as HTMLButtonElement).style.color = '#aaa' }}>
          {fullscreen ? '⊡' : '⛶'}
        </button>
      </div>

      {/* Fullscreen overlay exit */}
      {fullscreen && (
        <button onClick={toggleFullscreen}
          style={{ position: 'fixed', top: 12, right: 12, zIndex: 9999, background: 'rgba(0,0,0,0.8)', border: '1px solid #444', borderRadius: 8, color: '#ccc', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '8px 14px' }}>
          ⊡ Выйти
        </button>
      )}

      {/* ── TAB: GAME ── */}
      {tab === 'game' && (
        <>
          {/* History pill bar */}
          <div style={{ display: 'flex', gap: 5, padding: '8px 12px', background: '#0e0e0e', borderBottom: '1px solid #181818', overflowX: 'auto', flexShrink: 0, alignItems: 'center' }}>
            <span style={{ fontSize: 9, color: '#444', letterSpacing: 1, flexShrink: 0, marginRight: 2 }}>ИСТОРИЯ</span>
            {history.map((h) => (
              <button key={h.id} onClick={() => verifyRound(h)}
                style={{ padding: '3px 10px', borderRadius: 20, border: `1px solid ${cpColor(h.crash_point)}33`, cursor: 'pointer', fontSize: 11, fontWeight: 800, background: `${cpColor(h.crash_point)}15`, color: cpColor(h.crash_point), flexShrink: 0, transition: 'all 0.1s' }}>
                {Number(h.crash_point).toFixed(2)}x
              </button>
            ))}
          </div>

          {/* Main area */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

            {/* Graph */}
            <div style={{ flex: 1, position: 'relative', background: '#0d0d0d', overflow: 'hidden' }}>
              {/* Round number */}
              <div style={{ position: 'absolute', top: 10, left: 12, fontSize: 10, color: '#2a2a2a', zIndex: 2, letterSpacing: 0.5 }}>
                ROUND #{state.roundNumber}
              </div>

              {/* Multiplier overlay */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
                {isBetting ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#666', marginBottom: 8, letterSpacing: 2 }}>ПРИЁМ СТАВОК</div>
                    <div style={{ fontSize: 80, fontWeight: 900, color: '#e4a832', lineHeight: 1, textShadow: '0 0 60px #e4a83260' }}>{bettingCountdown}</div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 6, letterSpacing: 1 }}>секунд</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 80, fontWeight: 900, lineHeight: 1, color: mulColor, textShadow: `0 0 60px ${mulColor}50`, transition: 'color 0.1s', fontVariantNumeric: 'tabular-nums' }}>
                      {mulDisplay.toFixed(2)}x
                    </div>
                    {isCrashed && (
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', marginTop: 10, letterSpacing: 3, opacity: 0.9 }}>CRASHED</div>
                    )}
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
            </div>

            {/* Players sidebar */}
            <div className="crash-sidebar" style={{ width: 190, background: '#111', borderLeft: '1px solid #1e1e1e', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '10px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ fontSize: 10, color: '#666', letterSpacing: 1, fontWeight: 700 }}>ИГРОКИ</span>
                {state.bets.length > 0 && (
                  <span style={{ fontSize: 10, background: '#1e1e1e', color: '#888', borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>{state.bets.length}</span>
                )}
              </div>
              {state.bets.length === 0 ? (
                <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '28px 0' }}>Нет ставок</div>
              ) : (
                state.bets.map((b, i) => {
                  const won = b.cashedOut
                  const lost = isCrashed && !b.cashedOut
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 14px', borderBottom: '1px solid #161616', background: won ? '#22c55e08' : lost ? '#ef444408' : 'transparent' }}>
                      <span style={{ fontSize: 12, color: won ? '#22c55e' : lost ? '#ef4444' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100, fontWeight: won || lost ? 700 : 400 }}>
                        {b.username}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 11, color: won ? '#22c55e' : lost ? '#555' : '#888' }}>
                        {won ? `${b.cashoutAt?.toFixed(2)}x` : `$${b.amount}`}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ── BET PANEL ── */}
          <div style={{ background: '#111', borderTop: '1px solid #1e1e1e', padding: '12px 14px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>

              {/* Amount */}
              <div style={{ flex: '1 1 150px', minWidth: 130 }}>
                <div style={{ fontSize: 9, color: '#666', marginBottom: 5, letterSpacing: 1, fontWeight: 700 }}>СТАВКА ($)</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <input value={betAmount} onChange={e => setBetAmount(e.target.value)}
                    type="number" min="0.1" disabled={isRunning || hasBet}
                    style={{ flex: 1, minWidth: 0, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 16, fontWeight: 900, outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
                  {[10, 50, 100].map(v => (
                    <button key={v} onClick={() => setBetAmount(String(v))} disabled={isRunning || hasBet}
                      style={{ padding: '9px 10px', borderRadius: 7, border: '1px solid #2a2a2a', background: '#161616', color: '#888', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                      +{v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto cashout */}
              <div style={{ flex: '0 1 140px', minWidth: 120 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <input type="checkbox" id="ac" checked={useAutoCashout} onChange={e => setUseAutoCashout(e.target.checked)} disabled={isRunning || hasBet} style={{ cursor: 'pointer', accentColor: '#e4a832' }} />
                  <label htmlFor="ac" style={{ fontSize: 9, color: useAutoCashout ? '#aaa' : '#555', letterSpacing: 1, cursor: 'pointer', fontWeight: 700 }}>АВТО КЕШАУТ</label>
                </div>
                <input value={autoCashout} onChange={e => setAutoCashout(e.target.value)}
                  type="number" min="1.01" step="0.01" placeholder="2.00"
                  disabled={!useAutoCashout || isRunning || hasBet}
                  style={{ width: '100%', background: '#161616', border: `1px solid ${useAutoCashout ? '#2a2a2a' : '#1e1e1e'}`, borderRadius: 8, padding: '9px 12px', color: useAutoCashout ? '#fff' : '#333', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Action button */}
              <div style={{ flex: '0 1 180px', minWidth: 150 }}>
                {isRunning && hasBet && !cashedOut ? (
                  <>
                    <div style={{ fontSize: 9, color: '#22c55e', marginBottom: 4, letterSpacing: 0.5, fontWeight: 700 }}>
                      СЕЙЧАС: ${(parseFloat(betAmount) * state.multiplier * 0.99).toFixed(2)}
                    </div>
                    <button onClick={sendCashout}
                      style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 900, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', animation: 'pulse 0.7s infinite', letterSpacing: 0.5 }}>
                      КЕШАУТ {state.multiplier.toFixed(2)}x
                    </button>
                  </>
                ) : cashedOut ? (
                  <div style={{ background: '#22c55e12', border: '1px solid #22c55e40', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#22c55e', marginBottom: 3, letterSpacing: 1 }}>ВЫИГРАЛ</div>
                    <div style={{ color: '#22c55e', fontWeight: 900, fontSize: 20 }}>+${myProfit?.toFixed(2)}</div>
                  </div>
                ) : (
                  <button onClick={sendBet} disabled={!isBetting || hasBet || !token}
                    style={{
                      width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 14,
                      fontSize: 15, fontWeight: 900, letterSpacing: 0.5, transition: 'all 0.15s',
                      cursor: isBetting && !hasBet && token ? 'pointer' : 'default',
                      background: isBetting && !hasBet && token ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#161616',
                      color: isBetting && !hasBet && token ? '#fff' : '#333',
                    }}>
                    {!token ? 'ВОЙДИ ДЛЯ СТАВКИ' : hasBet ? '✓ ПРИНЯТО' : isBetting ? `BET $${betAmount}` : isRunning ? 'РАУНД ИДЁТ...' : 'ОЖИДАНИЕ...'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: MY BETS ── */}
      {tab === 'my-bets' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>История твоих ставок в текущей сессии</div>
          <div style={{ fontSize: 12, color: '#444', textAlign: 'center', paddingTop: 40 }}>
            {!token ? 'Войди чтобы увидеть свои ставки' : 'Ставок пока нет'}
          </div>
        </div>
      )}

      {/* ── TAB: PROVABLY FAIR ── */}
      {tab === 'fair' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, maxWidth: 560 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 }}>🔒 Provably Fair</div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7, marginBottom: 20 }}>
            Каждый раунд генерируется с помощью HMAC-SHA256(serverSeed, clientSeed).<br />
            Хэш серверного сида публикуется <b style={{ color: '#aaa' }}>до</b> раунда, сид раскрывается <b style={{ color: '#aaa' }}>после</b> — так ты можешь убедиться что результат не подменён.
          </div>

          {verifyData && !verifyData.error && verifyModal ? (
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 12 }}>Round #{verifyModal.round_number}</div>
              {([['Crash Point', `${verifyData.crashPoint}x`], ['Server Seed', verifyData.serverSeed], ['Hash', verifyData.serverSeedHash], ['Client Seed', verifyData.clientSeed]] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: '#555', marginBottom: 3, letterSpacing: 1, fontWeight: 700 }}>{k}</div>
                  <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#999', wordBreak: 'break-all', fontFamily: 'monospace' }}>{v}</div>
                </div>
              ))}
              <div style={{ padding: '12px 16px', borderRadius: 10, marginTop: 4, background: verifyData.verified ? '#22c55e12' : '#ef444412', border: `1px solid ${verifyData.verified ? '#22c55e40' : '#ef444440'}`, color: verifyData.verified ? '#22c55e' : '#ef4444', fontWeight: 800, textAlign: 'center', fontSize: 13 }}>
                {verifyData.verified ? '✅ Результат честный' : '❌ Верификация не прошла'}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#444' }}>
              Нажми на любой раунд в истории чтобы верифицировать его.
            </div>
          )}

          <div style={{ marginTop: 24, padding: 14, background: '#111', borderRadius: 10, border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 8, letterSpacing: 1, fontWeight: 700 }}>ТЕКУЩИЙ РАУНД</div>
            <div style={{ fontSize: 10, color: '#666', marginBottom: 3 }}>Server Seed Hash (до раунда):</div>
            <div style={{ background: '#161616', borderRadius: 6, padding: '7px 10px', fontSize: 10, color: '#777', wordBreak: 'break-all', fontFamily: 'monospace' }}>{state.serverSeedHash || '—'}</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 8, marginBottom: 3 }}>Client Seed:</div>
            <div style={{ background: '#161616', borderRadius: 6, padding: '7px 10px', fontSize: 10, color: '#777', wordBreak: 'break-all', fontFamily: 'monospace' }}>{state.clientSeed || '—'}</div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.02)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(max-width:640px){ .crash-sidebar{ display:none !important; } }
      `}</style>
    </div>
  )
}
