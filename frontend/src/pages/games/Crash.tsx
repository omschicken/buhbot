import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'

const CRASH_WS_URL = import.meta.env.VITE_CRASH_WS_URL || 'wss://buhbot-production-ddcd.up.railway.app/crash'

type GameStatus = 'waiting' | 'betting' | 'running' | 'crashed'

interface BetEntry { username: string; amount: number; cashedOut: boolean; cashoutAt?: number }
interface HistoryEntry { id: string; round_number: number; crash_point: number; server_seed_hash: string; client_seed: string }
interface GameState {
  roundId: string | null; roundNumber: number; status: GameStatus; multiplier: number
  serverSeedHash: string; clientSeed: string; bettingEndsAt: number; startTime: number; bets: BetEntry[]
}

const crashColor = (x: number) => x < 2 ? '#ef4444' : x < 5 ? '#f59e0b' : '#22c55e'

export default function CrashGame() {
  const { token } = useAuthStore()
  const { addToast } = useUIStore()
  const wsRef = useRef<WebSocket | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointsRef = useRef<{ x: number; y: number }[]>([])

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
  const [crashedAt, setCrashedAt] = useState(1)
  const stateRef = useRef(state)
  stateRef.current = state

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const pts = pointsRef.current
    if (pts.length < 2) return
    const isCrashed = stateRef.current.status === 'crashed'
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = isCrashed ? '#ef4444' : '#00e701'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.stroke()
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, isCrashed ? '#ef444430' : '#00e70130')
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
    const x = Math.min(W - 10, 10 + elapsed * 50)
    const logM = Math.log(Math.max(1, multiplier))
    const maxLog = Math.log(10)
    const y = H - 10 - ((logM / maxLog) * (H - 30))
    pointsRef.current.push({ x, y: Math.max(10, y) })
    drawGraph()
  }, [drawGraph])

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/crash/history`)
      const d = await r.json()
      setHistory((d.data || []).slice(0, 8))
    } catch { }
  }, [])

  useEffect(() => { loadHistory() }, [])

  useEffect(() => {
    const url = token ? `${CRASH_WS_URL}?token=${token}` : CRASH_WS_URL
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => { setWsConnected(true) }
    ws.onclose = () => { setWsConnected(false) }
    ws.onerror = () => { setWsConnected(false) }

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'init') { setState(msg.state as GameState) }
      if (msg.type === 'round_start') {
        pointsRef.current = []
        setCrashed(false); setCrashedAt(1); setHasBet(false); setCashedOut(false); setMyProfit(null)
        setState(prev => ({ ...prev, roundId: msg.roundId, roundNumber: msg.roundNumber, serverSeedHash: msg.serverSeedHash, clientSeed: msg.clientSeed, status: 'betting', multiplier: 1, bettingEndsAt: msg.bettingEndsAt, bets: [] }))
      }
      if (msg.type === 'round_running') {
        pointsRef.current = []
        setState(prev => ({ ...prev, status: 'running', startTime: msg.startTime, multiplier: 1 }))
      }
      if (msg.type === 'tick') {
        setState(prev => { updateCanvas(msg.multiplier, prev.startTime); return { ...prev, multiplier: msg.multiplier, status: 'running' } })
      }
      if (msg.type === 'crashed') {
        setCrashed(true); setCrashedAt(msg.crashPoint)
        setState(prev => ({ ...prev, status: 'crashed', multiplier: msg.crashPoint }))
        drawGraph(); loadHistory()
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

    return () => { ws.close() }
  }, [token])

  useEffect(() => {
    if (state.status !== 'betting') return
    const interval = setInterval(() => {
      setBettingCountdown(Math.max(0, Math.ceil((state.bettingEndsAt - Date.now()) / 1000)))
    }, 100)
    return () => clearInterval(interval)
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
    setVerifyModal(r); setVerifyData(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/crash/verify/${r.id}`)
      setVerifyData((await res.json()).data)
    } catch { setVerifyData({ error: 'Ошибка загрузки' }) }
  }

  const multiplierDisplay = crashed ? crashedAt : state.multiplier
  const isRunning = state.status === 'running'
  const isBetting = state.status === 'betting'
  const isCrashed = state.status === 'crashed'
  const mulColor = isCrashed ? '#ef4444' : '#00e701'

  if (!wsConnected) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: '#fff', gap: 14 }}>
      <div style={{ fontSize: 44 }}>🚀</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>Crash</div>
      <div style={{ width: 28, height: 28, border: '3px solid #222', borderTopColor: '#e4a832', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 12, color: '#333' }}>Подключение к серверу игры...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', background: '#0d0d0d', color: '#fff', minHeight: '100%' }}>

      {/* History bar */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px', background: '#111', borderBottom: '1px solid #1a1a1a', overflowX: 'auto', flexShrink: 0 }}>
        <span style={{ fontSize: 10, color: '#333', alignSelf: 'center', flexShrink: 0, marginRight: 4 }}>ИСТОРИЯ:</span>
        {history.map((h) => (
          <button key={h.id} onClick={() => verifyRound(h)}
            style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: '#1a1a1a', color: crashColor(h.crash_point), flexShrink: 0 }}>
            {Number(h.crash_point).toFixed(2)}x
          </button>
        ))}
      </div>

      {/* Main: graph + sidebar */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* Graph */}
        <div style={{ flex: 1, position: 'relative', background: '#111', minHeight: 280 }}>
          <div style={{ position: 'absolute', top: 10, left: 14, fontSize: 10, color: '#2a2a2a', zIndex: 2 }}>
            Round #{state.roundNumber}
          </div>

          {/* Big multiplier */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
            {isBetting ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#555', marginBottom: 6, letterSpacing: 1 }}>BETTING PHASE</div>
                <div style={{ fontSize: 72, fontWeight: 900, color: '#e4a832', lineHeight: 1 }}>{bettingCountdown}s</div>
                <div style={{ fontSize: 11, color: '#444', marginTop: 6 }}>Placing bets...</div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: mulColor, textShadow: `0 0 40px ${mulColor}60`, transition: 'color 0.15s' }}>
                  {multiplierDisplay.toFixed(2)}x
                </div>
                {isCrashed && <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444', marginTop: 8, letterSpacing: 2 }}>CRASHED</div>}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} width={900} height={380}
            style={{ width: '100%', height: '100%', display: 'block', minHeight: 280 }} />
        </div>

        {/* Players sidebar — hidden on mobile */}
        <div style={{ width: 180, background: '#0f0f0f', borderLeft: '1px solid #1a1a1a', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column' }}
          className="crash-sidebar">
          <div style={{ fontSize: 10, color: '#2a2a2a', letterSpacing: 0.5, padding: '10px 12px 6px' }}>
            PLAYERS {state.bets.length > 0 ? `(${state.bets.length})` : ''}
          </div>
          {state.bets.length === 0 && (
            <div style={{ fontSize: 11, color: '#222', textAlign: 'center', padding: '20px 0' }}>—</div>
          )}
          {state.bets.map((b, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 12px', borderBottom: '1px solid #141414', fontSize: 11 }}>
              <span style={{ color: b.cashedOut ? '#22c55e' : isCrashed && !b.cashedOut ? '#ef4444' : '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
                {b.username}
              </span>
              <span style={{ fontWeight: 700, color: b.cashedOut ? '#22c55e' : '#333', fontSize: 10 }}>
                {b.cashedOut ? `${b.cashoutAt?.toFixed(2)}x` : `$${b.amount}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bet panel */}
      <div style={{ background: '#161616', borderTop: '1px solid #1e1e1e', padding: '14px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>

          {/* Amount */}
          <div style={{ flex: '1 1 140px', minWidth: 120 }}>
            <div style={{ fontSize: 9, color: '#444', marginBottom: 5, letterSpacing: 0.5 }}>СТАВКА ($)</div>
            <div style={{ display: 'flex', gap: 5 }}>
              <input value={betAmount} onChange={e => setBetAmount(e.target.value)}
                type="number" min="0.1" disabled={isRunning || hasBet}
                style={{ flex: 1, minWidth: 0, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 10px', color: '#fff', fontSize: 15, fontWeight: 800, outline: 'none' }} />
              {['10', '50', '100'].map(v => (
                <button key={v} onClick={() => setBetAmount(v)} disabled={isRunning || hasBet}
                  style={{ padding: '10px 8px', borderRadius: 7, border: '1px solid #222', background: '#1a1a1a', color: '#444', fontSize: 10, cursor: 'pointer', flexShrink: 0 }}>
                  +{v}
                </button>
              ))}
            </div>
          </div>

          {/* Auto cashout */}
          <div style={{ flex: '0 1 130px', minWidth: 110 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
              <input type="checkbox" checked={useAutoCashout} onChange={e => setUseAutoCashout(e.target.checked)} disabled={isRunning || hasBet} id="ac" style={{ cursor: 'pointer' }} />
              <label htmlFor="ac" style={{ fontSize: 9, color: useAutoCashout ? '#888' : '#444', letterSpacing: 0.5, cursor: 'pointer' }}>AUTO CASHOUT</label>
            </div>
            <input value={autoCashout} onChange={e => setAutoCashout(e.target.value)}
              type="number" min="1.01" step="0.01" placeholder="2.00x"
              disabled={!useAutoCashout || isRunning || hasBet}
              style={{ width: '100%', background: '#111', border: `1px solid ${useAutoCashout ? '#333' : '#1e1e1e'}`, borderRadius: 8, padding: '10px 10px', color: useAutoCashout ? '#fff' : '#2a2a2a', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {/* Action button */}
          <div style={{ flex: '0 1 170px', minWidth: 140 }}>
            {isRunning && hasBet && !cashedOut ? (
              <>
                <div style={{ fontSize: 9, color: '#22c55e', marginBottom: 4, letterSpacing: 0.5 }}>
                  ВЫИГРЫШ: ${(parseFloat(betAmount) * state.multiplier * 0.99).toFixed(2)}
                </div>
                <button onClick={sendCashout}
                  style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 900, background: '#ef4444', color: '#fff', animation: 'pulse 0.8s infinite' }}>
                  CASHOUT {state.multiplier.toFixed(2)}x
                </button>
              </>
            ) : cashedOut ? (
              <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#22c55e', marginBottom: 2 }}>ВЫВЕЛ</div>
                <div style={{ color: '#22c55e', fontWeight: 900, fontSize: 16 }}>+${myProfit?.toFixed(2)}</div>
              </div>
            ) : (
              <button onClick={sendBet} disabled={!isBetting || hasBet || !token}
                style={{
                  width: '100%', padding: '12px', borderRadius: 10, border: 'none', marginTop: 14,
                  fontSize: 14, fontWeight: 900, cursor: isBetting && !hasBet && token ? 'pointer' : 'default',
                  background: isBetting && !hasBet && token ? '#22c55e' : '#1a1a1a',
                  color: isBetting && !hasBet && token ? '#000' : '#333',
                }}>
                {!token ? 'ВОЙДИ ДЛЯ СТАВКИ' : hasBet ? '✓ ПРИНЯТО' : isBetting ? `BET $${betAmount}` : isRunning ? 'РАУНД ИДЁТ...' : 'ОЖИДАНИЕ'}
              </button>
            )}
          </div>
        </div>

        {/* PF link */}
        <div style={{ textAlign: 'center', marginTop: 10 }}>
          <span onClick={() => history[0] && verifyRound(history[0])}
            style={{ fontSize: 10, color: '#2a2a2a', cursor: 'pointer' }}>
            🔒 Provably Fair — нажми для верификации
          </span>
        </div>
      </div>

      {/* Verify modal */}
      {verifyModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000b0', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 16, padding: 24, width: '100%', maxWidth: 460, maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>🔒 Round #{verifyModal.round_number}</h3>
              <button onClick={() => setVerifyModal(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            {!verifyData ? (
              <div style={{ color: '#444', textAlign: 'center', padding: 24, fontSize: 13 }}>Загрузка...</div>
            ) : verifyData.error ? (
              <div style={{ color: '#ef4444', fontSize: 13 }}>{verifyData.error}</div>
            ) : (
              <>
                {[['Crash Point', `${verifyData.crashPoint}x`], ['Server Seed', verifyData.serverSeed], ['Hash', verifyData.serverSeedHash], ['Client Seed', verifyData.clientSeed]].map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#444', marginBottom: 4 }}>{k}</div>
                    <div style={{ background: '#111', border: '1px solid #222', borderRadius: 6, padding: '8px 10px', fontSize: 10, color: '#666', wordBreak: 'break-all', fontFamily: 'monospace' }}>{v}</div>
                  </div>
                ))}
                <div style={{ padding: '10px 14px', borderRadius: 8, background: verifyData.verified ? '#22c55e15' : '#ef444415', border: `1px solid ${verifyData.verified ? '#22c55e30' : '#ef444430'}`, color: verifyData.verified ? '#22c55e' : '#ef4444', fontWeight: 700, textAlign: 'center', fontSize: 12 }}>
                  {verifyData.verified ? '✅ Результат честный' : '❌ Верификация не прошла'}
                </div>
                <div style={{ marginTop: 12, fontSize: 10, color: '#333', lineHeight: 1.7 }}>
                  HMAC-SHA256(serverSeed, clientSeed) → crash point.<br />
                  Hash публикуется до раунда, seed — после.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.85} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(max-width:600px){
          .crash-sidebar{ display:none !important; }
        }
      `}</style>
    </div>
  )
}
