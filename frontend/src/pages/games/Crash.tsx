import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'

const CRASH_WS_URL = import.meta.env.VITE_CRASH_WS_URL || 'wss://crash-game-production.up.railway.app/crash'

type GameStatus = 'waiting' | 'betting' | 'running' | 'crashed'

interface BetEntry { username: string; amount: number; cashedOut: boolean; cashoutAt?: number }
interface HistoryEntry { id: string; round_number: number; crash_point: number; server_seed_hash: string; client_seed: string }
interface GameState {
  roundId: string | null
  roundNumber: number
  status: GameStatus
  multiplier: number
  serverSeedHash: string
  clientSeed: string
  bettingEndsAt: number
  startTime: number
  bets: BetEntry[]
}

const crashColor = (x: number) => x < 2 ? '#ef4444' : x < 5 ? '#f59e0b' : '#22c55e'

export default function CrashGame() {
  const { token } = useAuthStore()
  const { addToast } = useUIStore()
  const wsRef = useRef<WebSocket | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef<{ x: number; y: number }[]>([])
  const animRef = useRef<number>(0)

  const [state, setState] = useState<GameState>({
    roundId: null, roundNumber: 0, status: 'waiting', multiplier: 1,
    serverSeedHash: '', clientSeed: '', bettingEndsAt: 0, startTime: 0, bets: []
  })
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
  const [crashedAt, setCrashedAt] = useState<number>(1)
  const stateRef = useRef(state)
  stateRef.current = state

  // Draw crash graph on canvas
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)

    const pts = pointsRef.current
    if (pts.length < 2) return

    // Background grid
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 1
    for (let i = 0; i <= 5; i++) {
      const y = H - (H * i) / 5
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    // Line
    const isCrashed = stateRef.current.status === 'crashed'
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = isCrashed ? '#ef4444' : '#00e701'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.stroke()

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, isCrashed ? '#ef444440' : '#00e70140')
    grad.addColorStop(1, 'transparent')
    ctx.lineTo(pts[pts.length - 1].x, H)
    ctx.lineTo(pts[0].x, H)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()
  }, [])

  const updateCanvas = useCallback((multiplier: number, startTime: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width, H = canvas.height
    const elapsed = (Date.now() - startTime) / 1000
    const x = Math.min(W - 20, 20 + elapsed * 60)
    // y: higher multiplier = lower on screen (inverted)
    const logM = Math.log(Math.max(1, multiplier))
    const maxLog = Math.log(10)
    const y = H - 20 - ((logM / maxLog) * (H - 40))
    pointsRef.current.push({ x, y: Math.max(20, y) })
    drawGraph()
  }, [drawGraph])

  // Load history
  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/crash/history`)
      const d = await r.json()
      setHistory((d.data || []).slice(0, 10))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadHistory() }, [])

  // WebSocket
  useEffect(() => {
    const url = token ? `${CRASH_WS_URL}?token=${token}` : CRASH_WS_URL
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => { console.log('Crash WS connected'); setWsConnected(true) }
    ws.onclose = () => { console.log('Crash WS disconnected'); setWsConnected(false) }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      if (msg.type === 'init') {
        const s = msg.state as GameState
        setState(s)
        if (s.status === 'running') {
          pointsRef.current = []
        }
      }

      if (msg.type === 'round_start') {
        pointsRef.current = []
        setCrashed(false)
        setCrashedAt(1)
        setHasBet(false)
        setCashedOut(false)
        setMyProfit(null)
        setState(prev => ({
          ...prev,
          roundId: msg.roundId,
          roundNumber: msg.roundNumber,
          serverSeedHash: msg.serverSeedHash,
          clientSeed: msg.clientSeed,
          status: 'betting',
          multiplier: 1,
          bettingEndsAt: msg.bettingEndsAt,
          bets: [],
        }))
      }

      if (msg.type === 'round_running') {
        setState(prev => ({ ...prev, status: 'running', startTime: msg.startTime, multiplier: 1 }))
        pointsRef.current = []
      }

      if (msg.type === 'tick') {
        setState(prev => {
          updateCanvas(msg.multiplier, prev.startTime)
          return { ...prev, multiplier: msg.multiplier, status: 'running' }
        })
      }

      if (msg.type === 'crashed') {
        setCrashed(true)
        setCrashedAt(msg.crashPoint)
        setState(prev => ({ ...prev, status: 'crashed', multiplier: msg.crashPoint }))
        drawGraph()
        loadHistory()
      }

      if (msg.type === 'bet_placed') {
        setState(prev => ({
          ...prev,
          bets: [...prev.bets.filter(b => b.username !== msg.username), {
            username: msg.username, amount: msg.amount, cashedOut: false
          }]
        }))
      }

      if (msg.type === 'cashout') {
        setState(prev => ({
          ...prev,
          bets: prev.bets.map(b =>
            b.username === msg.username
              ? { ...b, cashedOut: true, cashoutAt: msg.multiplier }
              : b
          )
        }))
      }

      if (msg.type === 'bet_accepted') {
        setHasBet(true)
        addToast(`Ставка ${msg.amount}$ принята`, 'success')
      }

      if (msg.type === 'cashout_confirmed') {
        setCashedOut(true)
        setMyProfit(msg.profit)
        addToast(`Вывод: $${Number(msg.profit).toFixed(2)}`, 'success')
      }

      if (msg.type === 'error') {
        addToast(msg.message, 'error')
      }
    }

    return () => { ws.close(); cancelAnimationFrame(animRef.current) }
  }, [token])

  // Betting countdown
  useEffect(() => {
    if (state.status !== 'betting') return
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((state.bettingEndsAt - Date.now()) / 1000))
      setBettingCountdown(left)
    }, 100)
    return () => clearInterval(interval)
  }, [state.status, state.bettingEndsAt])

  const sendBet = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    const amount = parseFloat(betAmount)
    if (!amount || amount <= 0) { addToast('Введи сумму ставки', 'error'); return }
    wsRef.current.send(JSON.stringify({
      type: 'bet',
      amount,
      autoCashout: useAutoCashout && autoCashout ? parseFloat(autoCashout) : undefined
    }))
  }

  const sendCashout = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({ type: 'cashout' }))
  }

  const verifyRound = async (r: HistoryEntry) => {
    setVerifyModal(r)
    setVerifyData(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/crash/verify/${r.id}`)
      const d = await res.json()
      setVerifyData(d.data)
    } catch { setVerifyData({ error: 'Failed' }) }
  }

  const multiplierDisplay = crashed ? crashedAt : state.multiplier
  const isRunning = state.status === 'running'
  const isBetting = state.status === 'betting'
  const isCrashed = state.status === 'crashed'

  if (!wsConnected) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 60px)', background: '#0d0d0d', color: '#fff', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🚀</div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>Crash</div>
      <div style={{ fontSize: 13, color: '#444' }}>Подключение к серверу...</div>
      <div style={{ width: 32, height: 32, border: '3px solid #222', borderTopColor: '#e4a832', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 11, color: '#333', marginTop: 8 }}>Сервис ещё не запущен или недоступен</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: '#0d0d0d', color: '#fff', overflow: 'hidden' }}>
      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 1, minHeight: 0 }}>

        {/* Graph area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', background: '#111', minHeight: 0 }}>
          {/* Round info top */}
          <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 11, color: '#333', zIndex: 2 }}>
            Round #{state.roundNumber}
          </div>

          {/* Multiplier big display */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none'
          }}>
            {isBetting ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>BETTING PHASE</div>
                <div style={{ fontSize: 64, fontWeight: 900, color: '#e4a832', lineHeight: 1 }}>{bettingCountdown}s</div>
                <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>Starting soon...</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: 80, fontWeight: 900, lineHeight: 1,
                  color: isCrashed ? '#ef4444' : '#00e701',
                  textShadow: isCrashed ? '0 0 40px #ef444480' : '0 0 40px #00e70180',
                  transition: 'color 0.1s'
                }}>
                  {multiplierDisplay.toFixed(2)}x
                </div>
                {isCrashed && <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444', marginTop: 8 }}>CRASHED!</div>}
              </div>
            )}
          </div>

          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={800} height={400}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />

          {/* History row bottom-left */}
          <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 6, zIndex: 2 }}>
            {history.map((h) => (
              <button key={h.id} onClick={() => verifyRound(h)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: '#1a1a1a', color: crashColor(h.crash_point),
                }}>
                {Number(h.crash_point).toFixed(2)}x
              </button>
            ))}
          </div>
        </div>

        {/* Bets sidebar */}
        <div style={{ width: 200, background: '#111', overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: '#333', letterSpacing: 0.5, padding: '12px 12px 8px' }}>
            PLAYERS ({state.bets.length})
          </div>
          {state.bets.map((b, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 12px', borderBottom: '1px solid #1a1a1a', fontSize: 12,
            }}>
              <span style={{ color: b.cashedOut ? '#22c55e' : isCrashed ? '#ef4444' : '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
                {b.username}
              </span>
              <span style={{ fontWeight: 700, color: b.cashedOut ? '#22c55e' : '#555', fontSize: 11 }}>
                {b.cashedOut ? `${b.cashoutAt?.toFixed(2)}x` : `$${b.amount}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bet panel */}
      <div style={{ background: '#161616', borderTop: '1px solid #1e1e1e', padding: '16px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', maxWidth: 700, margin: '0 auto' }}>

          {/* Amount input */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, color: '#444', marginBottom: 6, letterSpacing: 0.5 }}>СТАВКА ($)</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                type="number" min="0.1"
                disabled={isRunning || hasBet}
                style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14, fontWeight: 700, outline: 'none' }}
              />
              {['10', '50', '100'].map(v => (
                <button key={v} onClick={() => setBetAmount(v)} disabled={isRunning || hasBet}
                  style={{ padding: '10px 10px', borderRadius: 7, border: '1px solid #2a2a2a', background: '#1a1a1a', color: '#555', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Auto cashout */}
          <div style={{ minWidth: 140 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <input type="checkbox" checked={useAutoCashout} onChange={e => setUseAutoCashout(e.target.checked)} disabled={isRunning || hasBet} id="autocheck" />
              <label htmlFor="autocheck" style={{ fontSize: 10, color: '#444', letterSpacing: 0.5, cursor: 'pointer' }}>AUTO CASHOUT</label>
            </div>
            <input
              value={autoCashout}
              onChange={e => setAutoCashout(e.target.value)}
              type="number" min="1.01" step="0.01" placeholder="2.00x"
              disabled={!useAutoCashout || isRunning || hasBet}
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', color: useAutoCashout ? '#fff' : '#333', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Action button */}
          <div style={{ minWidth: 160 }}>
            {isRunning && hasBet && !cashedOut ? (
              <div>
                <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 4, letterSpacing: 0.5 }}>
                  CURRENT WIN: ${(parseFloat(betAmount) * state.multiplier * 0.99).toFixed(2)}
                </div>
                <button onClick={sendCashout}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 900, background: '#ef4444', color: '#fff', animation: 'pulse 1s infinite' }}>
                  CASHOUT {state.multiplier.toFixed(2)}x
                </button>
              </div>
            ) : cashedOut ? (
              <div>
                <div style={{ fontSize: 10, color: '#22c55e', marginBottom: 4 }}>CASHED OUT!</div>
                <div style={{ background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: 10, padding: '12px', textAlign: 'center', color: '#22c55e', fontWeight: 700, fontSize: 15 }}>
                  +${myProfit?.toFixed(2)}
                </div>
              </div>
            ) : (
              <button
                onClick={sendBet}
                disabled={!isBetting || hasBet || !token}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: isBetting && !hasBet ? 'pointer' : 'default',
                  fontSize: 15, fontWeight: 900, marginTop: 18,
                  background: isBetting && !hasBet ? '#22c55e' : '#1a1a1a',
                  color: isBetting && !hasBet ? '#000' : '#444',
                  opacity: !token ? 0.5 : 1,
                }}>
                {!token ? 'ВОЙДИ ДЛЯ СТАВКИ' : hasBet ? 'СТАВКА ПРИНЯТА' : isBetting ? `BET ($${betAmount})` : isRunning ? 'В ИГРЕ...' : 'ОЖИДАНИЕ'}
              </button>
            )}
          </div>
        </div>

        {/* Provably fair link */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 10, color: '#333', cursor: 'pointer' }} onClick={() => history[0] && verifyRound(history[0])}>
            🔒 Provably Fair — нажми для верификации последнего раунда
          </span>
        </div>
      </div>

      {/* Verify modal */}
      {verifyModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000c0', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 16, padding: 28, width: 480, maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>🔒 Provably Fair — Round #{verifyModal.round_number}</h3>
              <button onClick={() => setVerifyModal(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {!verifyData ? (
              <div style={{ color: '#444', textAlign: 'center', padding: 20 }}>Загрузка...</div>
            ) : verifyData.error ? (
              <div style={{ color: '#ef4444' }}>{verifyData.error}</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                  {[
                    ['Crash Point', `${verifyData.crashPoint}x`],
                    ['Server Seed', verifyData.serverSeed],
                    ['Server Seed Hash', verifyData.serverSeedHash],
                    ['Client Seed', verifyData.clientSeed],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 10, color: '#444', marginBottom: 4 }}>{k}</div>
                      <div style={{ background: '#111', border: '1px solid #222', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#888', wordBreak: 'break-all', fontFamily: 'monospace' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{
                  padding: '12px 16px', borderRadius: 8,
                  background: verifyData.verified ? '#22c55e20' : '#ef444420',
                  border: `1px solid ${verifyData.verified ? '#22c55e40' : '#ef444440'}`,
                  color: verifyData.verified ? '#22c55e' : '#ef4444',
                  fontWeight: 700, textAlign: 'center', fontSize: 13,
                }}>
                  {verifyData.verified ? '✅ Раунд верифицирован — результат честный' : '❌ Верификация не прошла'}
                </div>
                <div style={{ marginTop: 16, fontSize: 11, color: '#444', lineHeight: 1.6 }}>
                  Формула: HMAC-SHA256(serverSeed, clientSeed) → crash point.<br />
                  Server Seed публикуется только после завершения раунда.<br />
                  Хэш публикуется до — ты можешь убедиться что seed не менялся.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 #ef444440; }
          50% { transform: scale(1.02); box-shadow: 0 0 0 8px transparent; }
        }
      `}</style>
    </div>
  )
}
