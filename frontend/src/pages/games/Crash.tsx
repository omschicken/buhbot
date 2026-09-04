import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import { getBalance } from '../../api/wallet'
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

// Храним время и множитель — x и y вычисляются при каждой отрисовке
interface Pt { t: number; m: number }

export default function CrashGame() {
  const { token, user, balance, setBalance } = useAuthStore()
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
  const graphContainerRef = useRef<HTMLDivElement>(null)
  const ptsRef = useRef<Pt[]>([])
  const maxMRef = useRef(2)
  const stateRef = useRef<GameState>({
    roundId: null, roundNumber: 0, status: 'waiting', multiplier: 1,
    serverSeedHash: '', clientSeed: '', bettingEndsAt: 0, startTime: 0, bets: []
  })

  const [state, setState] = useState<GameState>(stateRef.current)
  interface BetSlot {
    id: string; amount: string; autoCashout: string; useAutoCashout: boolean
    hasBet: boolean; betId: string | null; cashedOut: boolean; profit: number | null
  }
  const newSlot = (): BetSlot => ({ id: Math.random().toString(36).slice(2), amount: '10', autoCashout: '', useAutoCashout: false, hasBet: false, betId: null, cashedOut: false, profit: null })
  const [slots, setSlots] = useState<BetSlot[]>([newSlot()])
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

    const PAD_L = 8, PAD_B = 8, PAD_T = 16, PAD_R = 24
    const gW = W - PAD_L - PAD_R
    const gH = H - PAD_T - PAD_B

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(PAD_L, PAD_T + gH * i / 4); ctx.lineTo(W - PAD_R, PAD_T + gH * i / 4); ctx.stroke() }
    for (let i = 1; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(PAD_L + gW * i / 6, PAD_T); ctx.lineTo(PAD_L + gW * i / 6, H - PAD_B); ctx.stroke() }

    const pts = ptsRef.current
    if (pts.length < 2) return
    const isCrashed = stateRef.current.status === 'crashed'
    const color = isCrashed ? '#ef4444' : '#00e676'

    // Динамический X: текущий момент = 75% ширины
    const maxT = pts[pts.length - 1].t / 0.75
    // Логарифмический Y: log(m)/log(maxM) — равномерно распределяет 1x–100x
    const maxM = maxMRef.current
    const logMax = Math.log(Math.max(maxM, 1.01))
    const toX = (t: number) => PAD_L + Math.min(gW, (t / maxT) * gW)
    const toY = (m: number) => {
      const logRatio = Math.log(Math.max(m, 1.001)) / logMax
      return PAD_T + gH - Math.min(gH, logRatio * gH)
    }

    const mapped = pts.map(p => ({ x: toX(p.t), y: Math.max(PAD_T, toY(p.m)) }))

    // Glow line
    ctx.save()
    ctx.shadowColor = color; ctx.shadowBlur = 18
    ctx.beginPath(); ctx.moveTo(mapped[0].x, mapped[0].y)
    for (let i = 1; i < mapped.length; i++) ctx.lineTo(mapped[i].x, mapped[i].y)
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke()
    ctx.restore()

    // Fill под кривой
    ctx.beginPath(); ctx.moveTo(mapped[0].x, mapped[0].y)
    for (let i = 1; i < mapped.length; i++) ctx.lineTo(mapped[i].x, mapped[i].y)
    ctx.lineTo(mapped[mapped.length - 1].x, H - PAD_B)
    ctx.lineTo(mapped[0].x, H - PAD_B); ctx.closePath()
    const g = ctx.createLinearGradient(0, PAD_T, 0, H - PAD_B)
    g.addColorStop(0, isCrashed ? 'rgba(239,68,68,0.22)' : 'rgba(0,230,118,0.18)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g; ctx.fill()

    // Точка на конце
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
    const w = Math.floor(rect.width)
    const h = Math.floor(rect.height)
    if (!w || !h) return
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    canvas.getContext('2d')!.scale(dpr, dpr)
  }, [])

  const updateCanvas = useCallback((multiplier: number, startTime: number) => {
    const elapsed = (Date.now() - startTime) / 1000
    const m = Math.max(1.001, multiplier)
    // Растим maxM чтобы текущая точка была на ~75% высоты
    if (m * 1.4 > maxMRef.current) maxMRef.current = m * 1.4
    ptsRef.current.push({ t: elapsed, m })
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

  // Обновляем баланс при входе на страницу и после кешаута
  useEffect(() => {
    if (!token) return
    getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})
  }, [token])

  useEffect(() => {
    const container = graphContainerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => { initCanvas(); drawGraph() })
    ro.observe(container)
    // двойной rAF: первый кадр — браузер рассчитывает flex-layout,
    // второй — размеры стабилизированы, можно читать getBoundingClientRect
    let raf2: number
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => { initCanvas(); drawGraph() })
    })
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); ro.disconnect() }
  // wsConnected: контейнер появляется в DOM только после подключения
  }, [initCanvas, drawGraph, wsConnected])

  // Если зашли в середине раунда — восстанавливаем историю тиков по startTime
  useEffect(() => {
    if (state.status !== 'running' || !state.startTime || ptsRef.current.length > 0) return
    const elapsed = (Date.now() - state.startTime) / 1000
    for (let t = 0.5; t <= elapsed; t += 0.5) {
      const m = Math.max(1.001, Math.pow(Math.E, 0.06 * t))
      if (m * 1.4 > maxMRef.current) maxMRef.current = m * 1.4
      ptsRef.current.push({ t, m })
    }
    drawGraph()
  }, [state.status, state.startTime, updateCanvas])

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
        stateRef.current = msg.state; setState(msg.state)
        if (msg.state.status === 'running' && msg.state.multiplier > 1) {
          maxMRef.current = Math.max(msg.state.multiplier * 1.4, 2)
        }
      }
      if (msg.type === 'round_start') {
        ptsRef.current = []; maxMRef.current = 2
        setCrashed(false); setCrashedAt(1)
        setSlots(prev => prev.map(s => ({ ...s, hasBet: false, betId: null, cashedOut: false, profit: null })))
        const s = { ...stateRef.current, roundId: msg.roundId, roundNumber: msg.roundNumber, serverSeedHash: msg.serverSeedHash, clientSeed: msg.clientSeed, status: 'betting' as GameStatus, multiplier: 1, bettingEndsAt: msg.bettingEndsAt, bets: [] }
        stateRef.current = s; setState(s)
      }
      if (msg.type === 'round_running') {
        ptsRef.current = []; maxMRef.current = 2
        setSlots(prev => prev.map(s => s.hasBet ? s : { ...s, hasBet: false, betId: null, cashedOut: false, profit: null }))
        setState(prev => { const s = { ...prev, status: 'running' as GameStatus, startTime: msg.startTime, multiplier: 1 }; stateRef.current = s; return s })
      }
      if (msg.type === 'tick') {
        setState(prev => { updateCanvas(msg.multiplier, prev.startTime); const s = { ...prev, multiplier: msg.multiplier, status: 'running' as GameStatus }; stateRef.current = s; return s })
      }
      if (msg.type === 'crashed') {
        setCrashed(true); setCrashedAt(msg.crashPoint)
        setState(prev => { const s = { ...prev, status: 'crashed' as GameStatus, multiplier: msg.crashPoint }; stateRef.current = s; return s })
        setTimeout(drawGraph, 50); loadHistory()
        getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})
      }
      if (msg.type === 'bet_placed') {
        setState(prev => ({ ...prev, bets: [...prev.bets.filter(b => b.username !== msg.username), { username: msg.username, amount: msg.amount, cashedOut: false }] }))
      }
      if (msg.type === 'cashout') {
        setState(prev => ({ ...prev, bets: prev.bets.map(b => b.username === msg.username ? { ...b, cashedOut: true, cashoutAt: msg.multiplier } : b) }))
        // Фоллбек: обновляем слот и показываем тост по broadcast (для авто и ручного)
        if (msg.betId && msg.profit) {
          setSlots(prev => {
            const updated = prev.map(s =>
              s.betId === msg.betId && !s.cashedOut
                ? { ...s, cashedOut: true, profit: msg.profit }
                : s
            )
            const changed = updated.some((s, i) => s !== prev[i])
            if (changed) {
              addToast(`Кешаут ${msg.multiplier?.toFixed(2)}x: $${Number(msg.profit).toFixed(2)}`, 'success')
              getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})
            }
            return updated
          })
        }
      }
      if (msg.type === 'bet_accepted') {
        setSlots(prev => prev.map(s => s.id === msg.slotId ? { ...s, hasBet: true, betId: msg.betId } : s))
        addToast(`Ставка $${msg.amount} принята`, 'success')
        getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})
      }
      if (msg.type === 'cashout_confirmed') {
        // cashout broadcast уже обновил слот и показал тост; здесь только синхронизируем баланс
        setSlots(prev => prev.map(s => s.betId === msg.betId ? { ...s, cashedOut: true, profit: msg.profit } : s))
        getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})
      }
      if (msg.type === 'error') { addToast(msg.message, 'error') }
    }
    return () => ws.close()
  }, [token])

  useEffect(() => {
    if (state.status !== 'betting') return
    const iv = setInterval(() => setBettingCountdown(Math.max(0, Math.ceil((state.bettingEndsAt - Date.now()) / 1000))), 100)
    return () => clearInterval(iv)
  }, [state.status, state.bettingEndsAt])

  const sendBet = (slot: BetSlot) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    const amount = parseFloat(slot.amount)
    if (!amount || amount <= 0) { addToast('Введи сумму ставки', 'error'); return }
    wsRef.current.send(JSON.stringify({ type: 'bet', slotId: slot.id, amount, autoCashout: slot.useAutoCashout && slot.autoCashout ? parseFloat(slot.autoCashout) : undefined }))
  }

  const sendCashout = (slot: BetSlot) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !slot.betId) return
    wsRef.current.send(JSON.stringify({ type: 'cashout', betId: slot.betId, slotId: slot.id }))
  }

  const updateSlot = (id: string, patch: Partial<BetSlot>) =>
    setSlots(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s))

  const addSlot = () => { if (slots.length < 5) setSlots(prev => [...prev, newSlot()]) }
  const removeSlot = (id: string) => { if (slots.length > 1) setSlots(prev => prev.filter(s => s.id !== id)) }

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
      <div style={{ fontSize: 44 }}>🚀</div>
      <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>CRASH</div>
      <div style={{ width: 28, height: 28, border: '3px solid #1e1e1e', borderTopColor: '#e4a832', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 12, color: '#444' }}>Подключение...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100svh', background: '#0a0a0a', color: '#fff', overflow: 'hidden' }}>
      <ToastContainer />

      {/* ── HEADER ── */}
      <div className="crash-header" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px', height: 48, background: '#111', borderBottom: '1px solid #1e1e1e', flexShrink: 0, minWidth: 0 }}>
        <button onClick={() => navigate('/')}
          style={{ background: '#1a1a1a', border: '1px solid #252525', borderRadius: 7, color: '#aaa', fontSize: 15, cursor: 'pointer', padding: '5px 9px', lineHeight: 1, flexShrink: 0 }}>
          ←
        </button>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: 0.5, flexShrink: 0 }}>🚀 CRASH</span>

        {/* Tabs */}
        <div style={{ display: 'flex', background: '#161616', borderRadius: 7, padding: 2, overflow: 'hidden', flexShrink: 0 }}>
          {([['game', 'Игра'], ['my-bets', 'Ставки'], ['fair', 'Честность']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '5px 9px', borderRadius: 5, border: 'none', fontSize: 10, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                background: tab === t ? '#252525' : 'none', color: tab === t ? '#fff' : '#555' }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {token && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 8, color: '#555', letterSpacing: 0.5 }}>БАЛАНС</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#e4a832' }}>${Number(balance).toFixed(2)}</div>
            </div>
          </div>
        ) : (
          <button onClick={() => navigate('/login')}
            style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: '#e4a832', color: '#000', fontSize: 11, fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}>
            Войти
          </button>
        )}

        <button onClick={toggleFullscreen} title={fullscreen ? 'Выйти' : 'Полный экран'}
          className="crash-fs-btn"
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 7, color: '#888', fontSize: 14, cursor: 'pointer', padding: '5px 8px', lineHeight: 1, flexShrink: 0 }}>
          {fullscreen ? '⊡' : '⛶'}
        </button>
      </div>

      {fullscreen && (
        <button onClick={toggleFullscreen}
          style={{ position: 'fixed', top: 10, right: 10, zIndex: 9999, background: 'rgba(0,0,0,0.85)', border: '1px solid #444', borderRadius: 8, color: '#ccc', fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '8px 14px' }}>
          ⊡ Выйти
        </button>
      )}

      {/* ── TAB: GAME ── */}
      {tab === 'game' && (
        <>
          {/* History bar */}
          <div style={{ display: 'flex', gap: 5, padding: '6px 10px', background: '#0e0e0e', borderBottom: '1px solid #181818', overflowX: 'auto', flexShrink: 0, alignItems: 'center' }}>
            <span style={{ fontSize: 8, color: '#444', letterSpacing: 1, flexShrink: 0 }}>ИСТОРИЯ</span>
            {history.map((h) => (
              <button key={h.id} onClick={() => verifyRound(h)}
                style={{ padding: '2px 9px', borderRadius: 20, border: `1px solid ${cpColor(h.crash_point)}44`, cursor: 'pointer', fontSize: 11, fontWeight: 800, background: `${cpColor(h.crash_point)}18`, color: cpColor(h.crash_point), flexShrink: 0 }}>
                {Number(h.crash_point).toFixed(2)}x
              </button>
            ))}
          </div>

          {/* Main: graph + sidebar */}
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* Graph */}
            <div ref={graphContainerRef} style={{ flex: 1, position: 'relative', background: '#0d0d0d', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 8, left: 10, fontSize: 9, color: '#2a2a2a', zIndex: 2, letterSpacing: 0.5 }}>
                ROUND #{state.roundNumber}
              </div>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
                {isBetting ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#666', marginBottom: 6, letterSpacing: 2 }}>ПРИЁМ СТАВОК</div>
                    <div className="crash-mul" style={{ fontWeight: 900, color: '#e4a832', lineHeight: 1, textShadow: '0 0 40px #e4a83260' }}>{bettingCountdown}</div>
                    <div style={{ fontSize: 9, color: '#555', marginTop: 4, letterSpacing: 1 }}>сек</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div className="crash-mul" style={{ fontWeight: 900, lineHeight: 1, color: mulColor, textShadow: `0 0 50px ${mulColor}50`, transition: 'color 0.1s', fontVariantNumeric: 'tabular-nums' }}>
                      {mulDisplay.toFixed(2)}x
                    </div>
                    {isCrashed && <div style={{ fontSize: 13, fontWeight: 800, color: '#ef4444', marginTop: 8, letterSpacing: 3 }}>CRASHED</div>}
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, display: 'block' }} />
            </div>

            {/* Players sidebar — desktop only */}
            <div className="crash-sidebar" style={{ width: 180, background: '#111', borderLeft: '1px solid #1e1e1e', overflowY: 'auto', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 12px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ fontSize: 9, color: '#666', letterSpacing: 1, fontWeight: 700 }}>ИГРОКИ</span>
                {state.bets.length > 0 && <span style={{ fontSize: 10, background: '#1e1e1e', color: '#777', borderRadius: 10, padding: '1px 7px', fontWeight: 700 }}>{state.bets.length}</span>}
              </div>
              {state.bets.length === 0
                ? <div style={{ fontSize: 11, color: '#333', textAlign: 'center', padding: '24px 0' }}>Нет ставок</div>
                : state.bets.map((b, i) => {
                  const won = b.cashedOut, lost = isCrashed && !b.cashedOut
                  return (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', borderBottom: '1px solid #161616', background: won ? '#22c55e08' : lost ? '#ef444408' : 'transparent' }}>
                      <span style={{ fontSize: 12, color: won ? '#22c55e' : lost ? '#666' : '#bbb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100, fontWeight: won ? 700 : 400 }}>{b.username}</span>
                      <span style={{ fontWeight: 800, fontSize: 11, color: won ? '#22c55e' : lost ? '#444' : '#888' }}>{won ? `${b.cashoutAt?.toFixed(2)}x` : `$${b.amount}`}</span>
                    </div>
                  )
                })
              }
            </div>
          </div>

          {/* ── BET PANEL ── */}
          <div style={{ background: '#111', borderTop: '1px solid #1e1e1e', padding: '8px 10px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {slots.map((slot) => {
                const locked = slot.hasBet  // редактировать можно всегда, ставить только в betting
                const canBet = isBetting && !slot.hasBet && !!token
                return (
                  <div key={slot.id} style={{ flex: '0 0 auto', minWidth: 200, maxWidth: 260, background: '#161616', borderRadius: 10, border: '1px solid #222', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Slot header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 8, color: '#555', letterSpacing: 1, fontWeight: 700 }}>СТАВКА ($)</span>
                      {slots.length > 1 && !slot.hasBet && (
                        <button onClick={() => removeSlot(slot.id)} style={{ background: 'none', border: 'none', color: '#444', fontSize: 14, cursor: 'pointer', lineHeight: 1, padding: '0 2px' }}>×</button>
                      )}
                    </div>

                    {/* Amount row */}
                    <div style={{ display: 'flex', gap: 3 }}>
                      <input value={slot.amount} onChange={e => updateSlot(slot.id, { amount: e.target.value })}
                        type="number" min="0.1" disabled={locked}
                        style={{ flex: 1, minWidth: 0, background: '#1a1a1a', border: '1px solid #252525', borderRadius: 6, padding: '7px 8px', color: '#fff', fontSize: 14, fontWeight: 900, outline: 'none', fontVariantNumeric: 'tabular-nums' }} />
                      {[10, 50, 100].map(v => (
                        <button key={v} onClick={() => updateSlot(slot.id, { amount: String(v) })} disabled={locked}
                          style={{ padding: '7px 6px', borderRadius: 5, border: '1px solid #252525', background: '#1e1e1e', color: '#666', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                          {v}
                        </button>
                      ))}
                    </div>

                    {/* Auto cashout */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input type="checkbox" id={`ac-${slot.id}`} checked={slot.useAutoCashout} onChange={e => updateSlot(slot.id, { useAutoCashout: e.target.checked })} disabled={locked} style={{ cursor: 'pointer', accentColor: '#e4a832' }} />
                      <label htmlFor={`ac-${slot.id}`} style={{ fontSize: 8, color: slot.useAutoCashout ? '#aaa' : '#444', cursor: 'pointer', fontWeight: 700, letterSpacing: 0.5 }}>АВТО</label>
                      <input value={slot.autoCashout} onChange={e => updateSlot(slot.id, { autoCashout: e.target.value })}
                        type="number" min="1.01" step="0.01" placeholder="2.00"
                        disabled={!slot.useAutoCashout || locked}
                        style={{ flex: 1, minWidth: 0, background: '#1a1a1a', border: `1px solid ${slot.useAutoCashout ? '#252525' : '#1a1a1a'}`, borderRadius: 6, padding: '5px 7px', color: slot.useAutoCashout ? '#fff' : '#2a2a2a', fontSize: 11, outline: 'none' }} />
                    </div>

                    {/* Action button */}
                    {isRunning && slot.hasBet && !slot.cashedOut ? (
                      <div>
                        <div style={{ fontSize: 8, color: '#22c55e', marginBottom: 4, fontWeight: 700 }}>
                          СЕЙЧАС: ${(parseFloat(slot.amount) * state.multiplier * 0.99).toFixed(2)}
                        </div>
                        <button onClick={() => sendCashout(slot)}
                          style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 900, background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', animation: 'pulse 0.7s infinite' }}>
                          КЕШАУТ {state.multiplier.toFixed(2)}x
                        </button>
                      </div>
                    ) : slot.cashedOut ? (
                      <div style={{ background: '#22c55e12', border: '1px solid #22c55e40', borderRadius: 8, padding: '9px', textAlign: 'center' }}>
                        <div style={{ fontSize: 8, color: '#22c55e', letterSpacing: 1 }}>ВЫИГРАЛ</div>
                        <div style={{ color: '#22c55e', fontWeight: 900, fontSize: 16 }}>+${slot.profit?.toFixed(2)}</div>
                      </div>
                    ) : (
                      <button onClick={() => sendBet(slot)} disabled={!canBet}
                        style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 900, transition: 'all 0.15s',
                          cursor: canBet ? 'pointer' : 'default',
                          background: canBet ? 'linear-gradient(135deg,#22c55e,#16a34a)' : '#1a1a1a',
                          color: canBet ? '#fff' : '#333' }}>
                        {!token ? 'ВОЙДИ' : slot.hasBet ? '✓ ПРИНЯТО' : isBetting ? `BET $${slot.amount}` : isRunning ? 'РАУНД ИДЁТ' : '...'}
                      </button>
                    )}
                  </div>
                )
              })}

              {/* Add slot button */}
              {slots.length < 5 && (
                <button onClick={addSlot}
                  style={{ flex: '0 0 auto', width: 44, borderRadius: 10, border: '1px dashed #2a2a2a', background: 'none', color: '#444', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  +
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── TAB: MY BETS ── */}
      {tab === 'my-bets' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ fontSize: 12, color: '#444', textAlign: 'center', paddingTop: 40 }}>
            {!token ? 'Войди чтобы увидеть свои ставки' : 'Ставок пока нет'}
          </div>
        </div>
      )}

      {/* ── TAB: FAIR ── */}
      {tab === 'fair' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 }}>🔒 Provably Fair</div>
          <div style={{ fontSize: 12, color: '#666', lineHeight: 1.7, marginBottom: 16 }}>
            Каждый раунд генерируется через HMAC-SHA256(serverSeed, clientSeed).<br />
            Хэш публикуется <b style={{ color: '#aaa' }}>до</b> раунда, сид раскрывается <b style={{ color: '#aaa' }}>после</b>.
          </div>
          {verifyData && !verifyData.error && verifyModal ? (
            <div>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 10 }}>Round #{verifyModal.round_number}</div>
              {([['Crash Point', `${verifyData.crashPoint}x`], ['Server Seed', verifyData.serverSeed], ['Hash', verifyData.serverSeedHash], ['Client Seed', verifyData.clientSeed]] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 8, color: '#555', marginBottom: 3, letterSpacing: 1, fontWeight: 700 }}>{k}</div>
                  <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 7, padding: '7px 10px', fontSize: 10, color: '#999', wordBreak: 'break-all', fontFamily: 'monospace' }}>{v}</div>
                </div>
              ))}
              <div style={{ padding: '11px 14px', borderRadius: 9, marginTop: 4, background: verifyData.verified ? '#22c55e12' : '#ef444412', border: `1px solid ${verifyData.verified ? '#22c55e40' : '#ef444440'}`, color: verifyData.verified ? '#22c55e' : '#ef4444', fontWeight: 800, textAlign: 'center', fontSize: 13 }}>
                {verifyData.verified ? '✅ Честный результат' : '❌ Верификация не прошла'}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: '#444', marginBottom: 16 }}>Нажми на раунд в истории для верификации.</div>
          )}
          <div style={{ marginTop: 16, padding: 14, background: '#111', borderRadius: 10, border: '1px solid #1e1e1e' }}>
            <div style={{ fontSize: 9, color: '#555', marginBottom: 8, letterSpacing: 1, fontWeight: 700 }}>ТЕКУЩИЙ РАУНД</div>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 3 }}>Server Seed Hash:</div>
            <div style={{ background: '#161616', borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#666', wordBreak: 'break-all', fontFamily: 'monospace', marginBottom: 8 }}>{state.serverSeedHash || '—'}</div>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 3 }}>Client Seed:</div>
            <div style={{ background: '#161616', borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#666', wordBreak: 'break-all', fontFamily: 'monospace' }}>{state.clientSeed || '—'}</div>
          </div>
        </div>
      )}

      <style>{`
        .crash-mul { font-size: 76px; }
        .crash-fs-btn { display: flex; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.015)} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(max-width:640px){
          .crash-sidebar { display:none !important; }
          .crash-fs-btn { display:none !important; }
          .crash-mul { font-size: 52px !important; }
        }
      `}</style>
    </div>
  )
}
