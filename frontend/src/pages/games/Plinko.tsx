import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import { getBalance } from '../../api/wallet'
import { api } from '../../api/axios'
import ToastContainer from '../../components/ui/Toast'

// ─── Multiplier tables ────────────────────────────────────────────────────────
const MULTIPLIERS: Record<string, Record<number, number[]>> = {
  low: {
    8:  [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    12: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8:  [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33],
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  },
  high: {
    8:  [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    12: [141, 22, 5, 2, 0.5, 0.2, 0.2, 0.5, 2, 5, 22, 141],
    16: [999, 130, 26, 9, 4, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 4, 9, 26, 130, 999],
  },
}

function bucketColor(m: number): string {
  if (m >= 100) return '#ff1111'
  if (m >= 10)  return '#ff3333'
  if (m >= 3)   return '#ff8c00'
  if (m >= 1)   return '#e4a832'
  return '#1a6b3c'
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Risk = 'low' | 'medium' | 'high'
type Rows = 8 | 12 | 16

interface RoundResult {
  roundId: string
  path: number[]
  bucket: number
  multiplier: number
  payout: number
  profit: number
  provablyFair: { serverSeed: string; serverSeedHash: string; clientSeed: string; nonce: number }
}

interface HistoryEntry {
  id: string; bet_amount: string; risk: string; rows: number
  bucket: number; multiplier: string; payout: string; profit: string; created_at: string
}

// ─── Canvas renderer ──────────────────────────────────────────────────────────
interface PinGlow { row: number; col: number; alpha: number }

function drawBoard(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  rows: Rows,
  mults: number[],
  ball: { x: number; y: number } | null,
  glows: PinGlow[],
  activeBucket: number | null,
  bucketPop: number,
) {
  ctx.clearRect(0, 0, W, H)

  const padX = 24
  const buckH = 34
  const boardH = H - buckH - 8
  const rowSpacing = boardH / (rows + 1)
  const bucketCount = rows + 1

  // Pin positions
  function pinX(row: number, col: number) {
    const pinsInRow = row + 3
    const totalW = W - padX * 2
    const spacing = totalW / (pinsInRow - 1)
    const startX = padX + (totalW - spacing * (pinsInRow - 1)) / 2
    return startX + col * spacing
  }
  function pinY(row: number) {
    return rowSpacing * (row + 1)
  }

  // Draw pins
  for (let row = 0; row < rows; row++) {
    const pinsInRow = row + 3
    const glow = glows.find(g => g.row === row)
    for (let col = 0; col < pinsInRow; col++) {
      const x = pinX(row, col)
      const y = pinY(row)
      const isGlowing = glow && glow.col === col
      ctx.beginPath()
      ctx.arc(x, y, isGlowing ? 5 : 3.5, 0, Math.PI * 2)
      if (isGlowing) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 10)
        g.addColorStop(0, `rgba(255,255,255,${glow.alpha})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.arc(x, y, 10, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
      }
      ctx.fillStyle = isGlowing ? `rgba(255,255,255,${0.5 + glow.alpha * 0.5})` : '#ffffff55'
      ctx.fill()
    }
  }

  // Buckets
  const totalW = W - padX * 2
  const bw = totalW / bucketCount
  const by = H - buckH
  for (let i = 0; i < bucketCount; i++) {
    const bx = padX + i * bw
    const m = mults[i]
    const col = bucketColor(m)
    const isActive = activeBucket === i
    const pop = isActive ? bucketPop : 0
    const scale = 1 + pop * 0.08
    const bwS = bw * scale
    const bhS = buckH * scale
    const bxS = bx + (bw - bwS) / 2
    const byS = by + (buckH - bhS) / 2

    ctx.save()
    ctx.beginPath()
    const r = 4
    ctx.moveTo(bxS + r, byS)
    ctx.lineTo(bxS + bwS - r, byS)
    ctx.quadraticCurveTo(bxS + bwS, byS, bxS + bwS, byS + r)
    ctx.lineTo(bxS + bwS, byS + bhS - r)
    ctx.quadraticCurveTo(bxS + bwS, byS + bhS, bxS + bwS - r, byS + bhS)
    ctx.lineTo(bxS + r, byS + bhS)
    ctx.quadraticCurveTo(bxS, byS + bhS, bxS, byS + bhS - r)
    ctx.lineTo(bxS, byS + r)
    ctx.quadraticCurveTo(bxS, byS, bxS + r, byS)
    ctx.closePath()

    ctx.fillStyle = isActive ? col : col + '88'
    ctx.fill()
    if (isActive) {
      ctx.shadowColor = col
      ctx.shadowBlur = 18
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.shadowBlur = 0
    }
    ctx.restore()

    ctx.fillStyle = '#fff'
    ctx.font = `bold ${m >= 100 ? 8 : m >= 10 ? 9 : 10}px system-ui`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${m}x`, bx + bw / 2, by + buckH / 2)
  }

  // Ball
  if (ball) {
    ctx.save()
    const gr = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 0, ball.x, ball.y, 9)
    gr.addColorStop(0, '#ff8888')
    gr.addColorStop(1, '#cc0000')
    ctx.beginPath()
    ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2)
    ctx.fillStyle = gr
    ctx.shadowColor = '#ff4444'
    ctx.shadowBlur = 14
    ctx.fill()
    ctx.restore()
  }
}

// ─── Main component ───────────────────────────────────────────────────────────
const CSS = `
  .pk { display:flex; flex-direction:column; width:100%; height:100svh; background:#0f0f0f; color:#fff; overflow:hidden; font-family:system-ui,sans-serif; }
  .pk-hdr { display:flex; align-items:center; gap:6px; padding:0 10px; height:48px; background:#111; border-bottom:1px solid #1e1e1e; flex-shrink:0; }
  .pk-tabs { display:flex; background:#161616; border-radius:7px; padding:2px; }
  .pk-tab { padding:5px 9px; border-radius:5px; border:none; font-size:10px; font-weight:700; cursor:pointer; white-space:nowrap; background:none; color:#555; }
  .pk-tab.on { background:#252525; color:#fff; }
  .pk-btn { background:#1a1a1a; border:1px solid #252525; border-radius:7px; color:#aaa; font-size:14px; cursor:pointer; padding:5px 9px; line-height:1; }

  .pk-body { flex:1; display:flex; min-height:0; overflow:hidden; }
  .pk-panel { width:220px; flex-shrink:0; background:#111; border-right:1px solid #1e1e1e; display:flex; flex-direction:column; padding:10px; gap:8px; overflow-y:auto; }
  .pk-canvas-wrap { flex:1; position:relative; min-width:0; }
  .pk-canvas { display:block; width:100%; height:100%; }

  .pk-label { font-size:9px; font-weight:700; letter-spacing:1px; color:#555; margin-bottom:3px; }
  .pk-input { width:100%; background:#161616; border:1px solid #252525; border-radius:7px; color:#fff; font-size:14px; font-weight:700; padding:8px 10px; box-sizing:border-box; text-align:right; }
  .pk-input:focus { outline:none; border-color:#e4a832; }
  .pk-half-row { display:flex; gap:4px; }
  .pk-half { flex:1; padding:6px; border-radius:6px; border:1px solid #252525; background:#161616; color:#888; font-size:11px; font-weight:700; cursor:pointer; }
  .pk-half:hover { color:#fff; }

  .pk-seg { display:flex; gap:4px; }
  .pk-seg-btn { flex:1; padding:7px 4px; border-radius:7px; border:2px solid #252525; background:#161616; color:#555; font-size:11px; font-weight:700; cursor:pointer; transition:all .15s; }
  .pk-seg-btn.on { border-color:var(--c); background:color-mix(in srgb, var(--c) 20%, #111); color:var(--c); }

  .pk-deal { width:100%; padding:13px; border-radius:9px; border:none; background:linear-gradient(135deg,#e4a832,#c98b1a); color:#000; font-size:14px; font-weight:900; cursor:pointer; letter-spacing:1px; margin-top:auto; }
  .pk-deal:disabled { opacity:.4; cursor:not-allowed; }

  .pk-stat { background:#161616; border-radius:8px; padding:8px 10px; }
  .pk-stat-row { display:flex; justify-content:space-between; font-size:10px; margin-bottom:2px; }

  .pk-hist { display:flex; flex-wrap:wrap; gap:3px; margin-top:4px; }
  .pk-hist-dot { width:28px; height:20px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:7px; font-weight:900; color:#fff; }

  .pk-result-overlay { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; pointer-events:none; }
  .pk-result-multi { font-size:48px; font-weight:900; line-height:1; }
  .pk-result-profit { font-size:20px; font-weight:900; margin-top:4px; }
  @keyframes pk-pop { 0%{opacity:0;transform:translate(-50%,-60%) scale(.6)} 40%{opacity:1;transform:translate(-50%,-50%) scale(1.15)} 100%{opacity:1;transform:translate(-50%,-50%) scale(1)} }
  .pk-result-overlay.show { animation:pk-pop .35s cubic-bezier(.22,.68,0,1.2) forwards; }

  .pk-fair-field { background:#161616; border:1px solid #252525; border-radius:7px; padding:8px 10px; font-size:10px; color:#aaa; word-break:break-all; margin-top:3px; }
`

type Tab = 'game' | 'history' | 'fair'

export default function PlinkoGame() {
  const navigate = useNavigate()
  const { token, balance, setBalance } = useAuthStore()
  const { addToast } = useUIStore()

  const [tab, setTab] = useState<Tab>('game')
  const [bet, setBet] = useState('1.00')
  const [risk, setRisk] = useState<Risk>('medium')
  const [rows, setRows] = useState<Rows>(16)
  const [playing, setPlaying] = useState(false)
  const [lastResult, setLastResult] = useState<RoundResult | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [sesHist, setSesHist] = useState<Array<{ m: number; bucket: number; rows: Rows }>>([])
  const [customSeed, setCustomSeed] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const glowsRef = useRef<PinGlow[]>([])
  const ballRef = useRef<{ x: number; y: number } | null>(null)
  const activeBucketRef = useRef<number | null>(null)
  const bucketPopRef = useRef(0)
  const rowsRef = useRef<Rows>(rows)
  const riskRef = useRef<Risk>(risk)

  useEffect(() => { rowsRef.current = rows }, [rows])
  useEffect(() => { riskRef.current = risk }, [risk])

  // ── Canvas sizing ──────────────────────────────────────────────────────────
  const getSize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return { W: 0, H: 0 }
    const parent = canvas.parentElement!
    const W = parent.clientWidth
    const H = parent.clientHeight
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W; canvas.height = H
    }
    return { W, H }
  }, [])

  // ── Render loop ────────────────────────────────────────────────────────────
  const renderRef = useRef<() => void>(() => {})
  renderRef.current = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const { W, H } = getSize()
    const mults = MULTIPLIERS[riskRef.current][rowsRef.current]
    drawBoard(ctx, W, H, rowsRef.current, mults, ballRef.current, glowsRef.current, activeBucketRef.current, bucketPopRef.current)

    // Decay glows
    glowsRef.current = glowsRef.current
      .map(g => ({ ...g, alpha: g.alpha - 0.04 }))
      .filter(g => g.alpha > 0)

    // Decay bucket pop
    if (bucketPopRef.current > 0) bucketPopRef.current = Math.max(0, bucketPopRef.current - 0.04)

    animRef.current = requestAnimationFrame(renderRef.current)
  }

  useEffect(() => {
    animRef.current = requestAnimationFrame(renderRef.current)
    const onResize = () => getSize()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', onResize) }
  }, [getSize])

  // ── Pin geometry helpers ──────────────────────────────────────────────────
  function getPinPos(row: number, col: number, W: number, H: number, r: Rows) {
    const padX = 24
    const buckH = 34
    const boardH = H - buckH - 8
    const rowSpacing = boardH / (r + 1)
    const pinsInRow = row + 3
    const totalW = W - padX * 2
    const spacing = totalW / (pinsInRow - 1)
    const startX = padX + (totalW - spacing * (pinsInRow - 1)) / 2
    return { x: startX + col * spacing, y: rowSpacing * (row + 1) }
  }

  function getBucketX(bucket: number, W: number, r: Rows) {
    const padX = 24
    const bucketCount = r + 1
    const bw = (W - padX * 2) / bucketCount
    return padX + bucket * bw + bw / 2
  }

  function getBucketY(H: number) { return H - 34 / 2 }

  // ── Animate ball along path ────────────────────────────────────────────────
  async function animateBall(path: number[], bucket: number, r: Rows) {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width; const H = canvas.height

    // Start above board
    const startX = W / 2
    const startY = -12
    ballRef.current = { x: startX, y: startY }

    // Compute positions for each step
    // col in our grid = number of R moves so far
    const positions: Array<{ x: number; y: number; row: number; col: number }> = []
    let col = 0
    for (let row = 0; row < r; row++) {
      const pinPos = getPinPos(row, col + 1, W, H, r)
      positions.push({ x: pinPos.x, y: pinPos.y, row, col: col + 1 })
      if (path[row] === 1) col++
    }
    // Final: bucket center
    const finalX = getBucketX(bucket, W, r)
    const finalY = getBucketY(H)

    const delay = Math.max(60, Math.min(150, 1200 / r))

    async function tweenTo(
      fromX: number, fromY: number,
      toX: number, toY: number,
      ms: number,
      onDone?: () => void,
    ) {
      return new Promise<void>(resolve => {
        const start = performance.now()
        function step(now: number) {
          const t = Math.min(1, (now - start) / ms)
          const ease = 1 - Math.pow(1 - t, 3)
          ballRef.current = { x: fromX + (toX - fromX) * ease, y: fromY + (toY - fromY) * ease }
          if (t < 1) requestAnimationFrame(step)
          else { if (onDone) onDone(); resolve() }
        }
        requestAnimationFrame(step)
      })
    }

    let prevX = startX; let prevY = startY
    for (let i = 0; i < positions.length; i++) {
      const { x, y, row, col: pc } = positions[i]
      await tweenTo(prevX, prevY, x, y, delay, () => {
        glowsRef.current.push({ row, col: pc, alpha: 1 })
      })
      prevX = x; prevY = y
    }

    // Slide to bucket
    await tweenTo(prevX, prevY, finalX, finalY, delay * 1.5)
    ballRef.current = null
    activeBucketRef.current = bucket
    bucketPopRef.current = 1
  }

  // ── Load history ───────────────────────────────────────────────────────────
  const loadHist = useCallback(async () => {
    try {
      const r = await api.get('/plinko/history')
      setHistory((r.data?.data?.items || []).slice(0, 30))
    } catch { }
  }, [])

  useEffect(() => {
    if (!token) return
    getBalance().then(r => setBalance(r.data?.balance ?? 0)).catch(() => {})
    loadHist()
  }, [token])

  // ── Play ───────────────────────────────────────────────────────────────────
  const play = async () => {
    if (playing) return
    const betNum = parseFloat(bet)
    if (!betNum || betNum <= 0) { addToast('Введите сумму ставки', 'error'); return }
    setPlaying(true)
    setShowResult(false)
    setLastResult(null)
    activeBucketRef.current = null
    bucketPopRef.current = 0

    try {
      const r = await api.post('/plinko/play', {
        betAmount: betNum, risk, rows,
        clientSeed: customSeed || undefined,
      })
      const d: RoundResult = r.data.data
      setLastResult(d)
      await animateBall(d.path, d.bucket, rows)
      setShowResult(true)
      setSesHist(p => [{ m: d.multiplier, bucket: d.bucket, rows }, ...p].slice(0, 30))
      getBalance().then(res => setBalance(res.data?.balance ?? 0)).catch(() => {})
      loadHist()
      setTimeout(() => { setShowResult(false); setPlaying(false) }, 2500)
    } catch (e: any) {
      addToast(e.response?.data?.error || e.message || 'Ошибка', 'error')
      setPlaying(false)
    }
  }

  const totalProfit = sesHist.reduce((s, h) => {
    const idx = MULTIPLIERS[risk][h.rows]
      ? MULTIPLIERS[risk][h.rows][h.bucket]
      : h.m
    return s + (idx - 1) * parseFloat(bet || '0')
  }, 0)

  const mults = MULTIPLIERS[risk][rows]

  return (
    <div className="pk">
      <style>{CSS}</style>
      <ToastContainer />

      {/* HEADER */}
      <div className="pk-hdr">
        <button className="pk-btn" onClick={() => navigate('/')}>←</button>
        <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: 1 }}>PLINKO</span>
        <div style={{ flex: 1 }} />
        <div className="pk-tabs">
          {(['game', 'history', 'fair'] as Tab[]).map(t => (
            <button key={t} className={`pk-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
              {t === 'game' ? 'Игра' : t === 'history' ? 'История' : 'Честность'}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#e4a832', fontWeight: 700 }}>${balance.toFixed(2)}</span>
      </div>

      {/* GAME TAB */}
      {tab === 'game' && (
        <div className="pk-body">
          {/* LEFT PANEL */}
          <div className="pk-panel">
            {/* Bet amount */}
            <div>
              <div className="pk-label">СТАВКА</div>
              <input
                className="pk-input"
                type="number" min="0.10" step="0.10"
                value={bet}
                onChange={e => setBet(e.target.value)}
                disabled={playing}
              />
              <div className="pk-half-row" style={{ marginTop: 4 }}>
                <button className="pk-half" disabled={playing} onClick={() => setBet(v => (+(parseFloat(v) / 2).toFixed(2)).toString())}>½</button>
                <button className="pk-half" disabled={playing} onClick={() => setBet(v => (+(parseFloat(v) * 2).toFixed(2)).toString())}>2×</button>
              </div>
            </div>

            {/* Risk */}
            <div>
              <div className="pk-label">РИСК</div>
              <div className="pk-seg">
                {(['low', 'medium', 'high'] as Risk[]).map(r => {
                  const col = r === 'low' ? '#22c55e' : r === 'medium' ? '#e4a832' : '#ef4444'
                  return (
                    <button key={r}
                      className={`pk-seg-btn${risk === r ? ' on' : ''}`}
                      style={{ '--c': col } as any}
                      onClick={() => !playing && setRisk(r)}
                    >
                      {r === 'low' ? 'Low' : r === 'medium' ? 'Mid' : 'High'}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Rows */}
            <div>
              <div className="pk-label">СТРОКИ</div>
              <div className="pk-seg">
                {([8, 12, 16] as Rows[]).map(n => (
                  <button key={n}
                    className={`pk-seg-btn${rows === n ? ' on' : ''}`}
                    style={{ '--c': '#3b82f6' } as any}
                    onClick={() => !playing && setRows(n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            {sesHist.length > 0 && (
              <div className="pk-stat">
                <div className="pk-stat-row">
                  <span style={{ color: '#555' }}>Прибыль</span>
                  <span style={{ color: totalProfit >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                    {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                  </span>
                </div>
                <div className="pk-stat-row">
                  <span style={{ color: '#555' }}>Раундов</span>
                  <span style={{ fontWeight: 700 }}>{sesHist.length}</span>
                </div>
              </div>
            )}

            {/* Session history dots */}
            {sesHist.length > 0 && (
              <div>
                <div className="pk-label">ИСТОРИЯ СЕССИИ</div>
                <div className="pk-hist">
                  {sesHist.slice(0, 20).map((h, i) => (
                    <div key={i} className="pk-hist-dot" style={{ background: bucketColor(h.m) }}>
                      {h.m >= 10 ? `${Math.round(h.m)}` : `${h.m}`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* BET button */}
            <button className="pk-deal" onClick={play} disabled={playing}>
              {playing ? 'ИГРА...' : 'СТАВИТЬ'}
            </button>
          </div>

          {/* CANVAS */}
          <div className="pk-canvas-wrap">
            <canvas ref={canvasRef} className="pk-canvas" />

            {/* Multiplier labels at top (static reference) */}
            <div style={{ position: 'absolute', top: 6, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, pointerEvents: 'none' }}>
              {mults.map((m, i) => (
                <span key={i} style={{ fontSize: 9, color: bucketColor(m), fontWeight: 700 }}>{m}x</span>
              ))}
            </div>

            {/* Result overlay */}
            {lastResult && showResult && (
              <div className="pk-result-overlay show" style={{ position: 'absolute', top: '45%', left: '50%' }}>
                <div className="pk-result-multi" style={{ color: bucketColor(lastResult.multiplier) }}>
                  {lastResult.multiplier}×
                </div>
                <div className="pk-result-profit" style={{ color: lastResult.profit >= 0 ? '#22c55e' : '#ef4444' }}>
                  {lastResult.profit >= 0 ? '+' : ''} ${lastResult.profit.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          {history.length === 0
            ? <div style={{ textAlign: 'center', color: '#333', marginTop: 40, fontSize: 13 }}>История пуста</div>
            : history.map(h => (
              <div key={h.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111', borderRadius: 8, padding: '9px 12px', marginBottom: 5 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: bucketColor(parseFloat(h.multiplier)) }}>{h.multiplier}×</div>
                  <div style={{ fontSize: 9, color: '#444' }}>{h.risk} · {h.rows}r</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: parseFloat(h.profit) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {parseFloat(h.profit) >= 0 ? '+' : ''}${parseFloat(h.profit).toFixed(2)}
                  </div>
                  <div style={{ fontSize: 9, color: '#444' }}>${parseFloat(h.bet_amount).toFixed(2)} ставка</div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* FAIR TAB */}
      {tab === 'fair' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 10, lineHeight: 1.6 }}>
            Каждый раунд определяется HMAC-SHA256 от serverSeed + clientSeed + nonce. Результат верифицируем после игры.
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#555', marginBottom: 3 }}>Client Seed</div>
            <input
              style={{ width: '100%', boxSizing: 'border-box', background: '#161616', border: '1px solid #252525', borderRadius: 7, color: '#fff', fontSize: 12, padding: '8px 10px' }}
              value={customSeed} placeholder="Ваш seed (необязательно)"
              onChange={e => setCustomSeed(e.target.value)}
            />
          </div>
          {lastResult && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Последний раунд</div>
              {[
                ['Server Seed', lastResult.provablyFair.serverSeed],
                ['Server Seed Hash', lastResult.provablyFair.serverSeedHash],
                ['Client Seed', lastResult.provablyFair.clientSeed],
                ['Nonce', String(lastResult.provablyFair.nonce)],
                ['Path', lastResult.path.map(d => d ? 'R' : 'L').join('')],
                ['Bucket', String(lastResult.bucket)],
                ['Multiplier', `${lastResult.multiplier}×`],
              ].map(([label, val]) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: '#555' }}>{label}</div>
                  <div className="pk-fair-field">{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
