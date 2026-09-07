import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'

const WS_URL = import.meta.env.VITE_WS_URL ||
  (import.meta.env.VITE_API_URL || 'https://api-gateaway-production-cd24.up.railway.app')
    .replace(/^https?/, 'wss').replace(/^http/, 'ws')

type GameStatus = 'waiting' | 'betting' | 'running' | 'pulled'

interface PlayerBet {
  username: string
  amount: number
  cashedOut: boolean
  cashoutAt?: number
  cashoutOrder?: number
}

interface HistoryRound {
  id: string
  round_number: number
  rug_point: string
  total_pool: string
  lost_pool: string
  pulled_at: string
}

interface BonusWinner {
  username: string
  cashoutAt: number
  bonus: number
}

export default function RugPull() {
  const navigate = useNavigate()
  const { token, user, balance } = useAuthStore()
  const [tab, setLocalTab] = useState<'game' | 'fair'>('game')

  // Game state
  const [status, setStatus] = useState<GameStatus>('waiting')
  const [multiplier, setMultiplier] = useState(1.00)
  const [totalPool, setTotalPool] = useState(0)
  const [playersCount, setPlayersCount] = useState(0)
  const [bets, setBets] = useState<PlayerBet[]>([])
  const [bettingCountdown, setBettingCountdown] = useState(30)
  const [roundNumber, setRoundNumber] = useState(0)
  const [lastRoundData, setLastRoundData] = useState<any>(null)

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
  const [showHelp, setShowHelp] = useState(false)

  // History
  const [history, setHistory] = useState<HistoryRound[]>([])

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const pointsRef = useRef<{ x: number; y: number }[]>([])
  const animFrameRef = useRef<number>(0)
  const statusRef = useRef<GameStatus>('waiting')
  const multiplierRef = useRef(1.00)
  const pulledRef = useRef(false)

  // WS
  const wsRef = useRef<WebSocket | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Resize canvas to match container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current
      const container = canvasContainerRef.current
      if (!canvas || !container) return
      const W = container.clientWidth
      const H = Math.min(Math.max(W * 0.45, 240), 360)
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W
        canvas.height = H
        pointsRef.current = [] // reset points on resize
      }
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width, H = canvas.height

    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)

    // Grid
    ctx.strokeStyle = 'rgba(255,140,0,0.08)'
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }

    const pts = pointsRef.current
    const fontSize = Math.max(24, Math.min(48, W / 14))
    if (pts.length < 2) {
      ctx.font = `bold ${fontSize}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const label = statusRef.current === 'betting'
        ? `Betting...`
        : statusRef.current === 'waiting'
        ? 'Waiting...'
        : pulledRef.current ? '🪤 RUG PULL!' : `${multiplierRef.current.toFixed(2)}x`
      ctx.fillStyle = pulledRef.current ? '#ff2222' : '#ff8c00'
      ctx.fillText(label, W / 2, H / 2)
      return
    }

    // Draw line
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
    ctx.strokeStyle = pulledRef.current ? '#ff2222' : '#ff8c00'
    ctx.lineWidth = 3
    ctx.shadowColor = pulledRef.current ? '#ff2222' : '#ff8c00'
    ctx.shadowBlur = 12
    ctx.stroke()
    ctx.shadowBlur = 0

    // Fill under line
    ctx.lineTo(pts[pts.length - 1].x, H)
    ctx.lineTo(pts[0].x, H)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, pulledRef.current ? 'rgba(255,34,34,0.3)' : 'rgba(255,140,0,0.3)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fill()

    // Multiplier label
    ctx.fillStyle = pulledRef.current ? '#ff2222' : '#ff8c00'
    ctx.font = `bold ${fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowColor = pulledRef.current ? '#ff2222' : '#ff8c00'
    ctx.shadowBlur = 16
    ctx.fillText(
      pulledRef.current ? `🪤 ${multiplierRef.current.toFixed(2)}x` : `${multiplierRef.current.toFixed(2)}x`,
      W / 2, H / 2
    )
    ctx.shadowBlur = 0
  }, [])

  const rafLoop = useCallback(() => {
    drawCanvas()
    animFrameRef.current = requestAnimationFrame(rafLoop)
  }, [drawCanvas])

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(rafLoop)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [rafLoop])

  const connectWS = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    const url = `${WS_URL.replace('/api', '')}/rugpull${token ? `?token=${token}` : ''}`
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)

      if (msg.type === 'init') {
        const s = msg.state
        setStatus(s.status)
        statusRef.current = s.status
        setMultiplier(s.multiplier)
        multiplierRef.current = s.multiplier
        setTotalPool(s.totalPool)
        setPlayersCount(s.playersCount)
        setBets(s.bets || [])
        if (s.status === 'betting') setBettingCountdown(30)
      }

      if (msg.type === 'round_start') {
        setStatus('betting')
        statusRef.current = 'betting'
        setRoundNumber(msg.roundNumber)
        setBettingCountdown(30)
        setMultiplier(1.00)
        multiplierRef.current = 1.00
        setTotalPool(0)
        setPlayersCount(0)
        setBets([])
        pointsRef.current = []
        pulledRef.current = false
        setMyBet(null)
        setMyCashoutAt(null)
        setMyPayout(null)
        setMyCashoutOrder(null)
        setMyBonus(null)
        setDidLose(false)
        setLastRoundData(null)

        if (countdownRef.current) clearInterval(countdownRef.current)
        let cd = 30
        countdownRef.current = setInterval(() => {
          cd -= 1
          setBettingCountdown(cd)
          if (cd <= 0 && countdownRef.current) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
          }
        }, 1000)
      }

      if (msg.type === 'round_running') {
        setStatus('running')
        statusRef.current = 'running'
        setTotalPool(msg.totalPool)
        setPlayersCount(msg.playersCount)
        if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
      }

      if (msg.type === 'tick') {
        setMultiplier(msg.multiplier)
        multiplierRef.current = msg.multiplier
        const canvas = canvasRef.current
        if (canvas) {
          const W = canvas.width, H = canvas.height
          const elapsed = msg.elapsed / 1000
          const maxElapsed = 60
          const x = Math.min((elapsed / maxElapsed) * W, W - 10)
          const norm = Math.log(msg.multiplier) / Math.log(50)
          const y = H - Math.min(norm * H * 0.85, H - 20)
          pointsRef.current.push({ x, y })
        }
      }

      if (msg.type === 'pulled') {
        setStatus('pulled')
        statusRef.current = 'pulled'
        pulledRef.current = true
        setLastRoundData(msg)
        setMultiplier(msg.rugPoint)
        multiplierRef.current = msg.rugPoint

        // Check if I lost
        const myUsername = user?.username
        if (myUsername && msg.losers?.includes(myUsername)) {
          setDidLose(true)
        }
        // Check if I got bonus
        if (user?.id && msg.bonusPayouts?.[user.id]) {
          setMyBonus(msg.bonusPayouts[user.id])
        }

        setHistory(prev => [{
          id: msg.roundId,
          round_number: roundNumber,
          rug_point: msg.rugPoint.toFixed(2),
          total_pool: msg.totalPool.toFixed(2),
          lost_pool: msg.lostPool.toFixed(2),
          pulled_at: new Date().toISOString()
        }, ...prev.slice(0, 19)])
      }

      if (msg.type === 'bet_placed') {
        setTotalPool(msg.totalPool)
        setPlayersCount(msg.playersCount)
        setBets(prev => {
          const exists = prev.find(b => b.username === msg.username)
          if (exists) return prev
          return [...prev, { username: msg.username, amount: msg.amount, cashedOut: false }]
        })
      }

      if (msg.type === 'bet_accepted') {
        setMyBet(msg.amount)
      }

      if (msg.type === 'cashout') {
        setBets(prev => prev.map(b =>
          b.username === msg.username
            ? { ...b, cashedOut: true, cashoutAt: msg.multiplier, cashoutOrder: msg.cashoutOrder }
            : b
        ))
        if (msg.userId === user?.id) {
          setMyCashoutAt(msg.multiplier)
          setMyPayout(msg.basePayout)
          setMyCashoutOrder(msg.cashoutOrder)
        }
      }

      if (msg.type === 'cashout_confirmed') {
        setMyPayout(msg.payout)
      }

      if (msg.type === 'pool_update') {
        setTotalPool(msg.totalPool)
        setPlayersCount(msg.playersCount)
      }

      if (msg.type === 'round_cancelled') {
        setStatus('waiting')
        statusRef.current = 'waiting'
        setBets([])
      }
    }

    ws.onclose = () => {
      setTimeout(connectWS, 2000)
    }
    ws.onerror = () => ws.close()
  }, [token, user, roundNumber])

  useEffect(() => {
    connectWS()
    return () => {
      wsRef.current?.close()
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [connectWS])

  const placeBet = () => {
    const amount = parseFloat(betInput)
    if (isNaN(amount) || amount <= 0) return
    if (status !== 'betting') return
    if (myBet !== null) return
    const ac = autoCashoutEnabled && autoCashoutInput ? parseFloat(autoCashoutInput) : undefined
    wsRef.current?.send(JSON.stringify({ type: 'bet', amount, autoCashout: ac }))
  }

  const doCashout = () => {
    if (status !== 'running' || myCashoutAt !== null) return
    wsRef.current?.send(JSON.stringify({ type: 'cashout' }))
  }

  const sortedBets = [...bets].sort((a, b) => {
    if (a.cashedOut && !b.cashedOut) return -1
    if (!a.cashedOut && b.cashedOut) return 1
    return (b.cashoutOrder || 0) - (a.cashoutOrder || 0)
  })

  const lastThreeOut = [...bets]
    .filter(b => b.cashedOut)
    .sort((a, b) => (b.cashoutOrder || 0) - (a.cashoutOrder || 0))
    .slice(0, 3)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1a1a1a', gap: 12 }}>
        <button onClick={() => { navigate('/') }}
          style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}>←</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#ff8c00' }}>🪤 Rug Pull</span>
        <span style={{ fontSize: 12, color: '#555', marginLeft: 4 }}>PvP · Round #{roundNumber}</span>
        <button onClick={() => setShowHelp(true)}
          style={{ marginLeft: 'auto', background: '#1a1a1a', border: '1px solid #333', borderRadius: '50%',
                   width: 28, height: 28, color: '#aaa', cursor: 'pointer', fontSize: 14 }}>?</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a' }}>
        {(['game', 'fair'] as const).map(t => (
          <button key={t} onClick={() => setLocalTab(t)}
            style={{ padding: '8px 20px', background: 'none', border: 'none', borderBottom: tab === t ? '2px solid #ff8c00' : '2px solid transparent',
                     color: tab === t ? '#ff8c00' : '#666', cursor: 'pointer', fontSize: 13 }}>
            {t === 'game' ? 'Game' : 'Provably Fair'}
          </button>
        ))}
      </div>

      <div style={{ display: tab === 'game' ? undefined : 'none' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
          {/* Left — History */}
          <div style={{ width: 120, minWidth: 100, borderRight: '1px solid #1a1a1a', padding: '8px 4px', maxHeight: 420, overflowY: 'auto' }}>
            <div style={{ fontSize: 10, color: '#555', textAlign: 'center', marginBottom: 6 }}>HISTORY</div>
            {history.map(r => (
              <div key={r.id} style={{ textAlign: 'center', padding: '3px 0', fontSize: 13, fontWeight: 700,
                                       color: parseFloat(r.rug_point) >= 5 ? '#22cc44' : parseFloat(r.rug_point) >= 2 ? '#ff8c00' : '#ff4444' }}>
                {parseFloat(r.rug_point).toFixed(2)}x
              </div>
            ))}
          </div>

          {/* Center — Canvas */}
          <div ref={canvasContainerRef} style={{ flex: 1, minWidth: 0, position: 'relative' }}>
            <canvas ref={canvasRef}
              style={{ display: 'block', background: '#0a0a0a', width: '100%' }} />

            {/* Pool overlay */}
            <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.7)',
                           padding: '6px 12px', borderRadius: 8, border: '1px solid #ff8c00' }}>
              <div style={{ fontSize: 10, color: '#888' }}>💰 POOL</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ff8c00' }}>${totalPool.toFixed(2)}</div>
              <div style={{ fontSize: 10, color: '#666' }}>{playersCount} players</div>
            </div>

            {/* Status badge */}
            {status === 'betting' && (
              <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.8)',
                             padding: '6px 14px', borderRadius: 8, border: '1px solid #ff8c00' }}>
                <div style={{ fontSize: 10, color: '#888' }}>BETTING ENDS IN</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#ff8c00' }}>{bettingCountdown}s</div>
              </div>
            )}

            {/* Rug pull overlay */}
            {status === 'pulled' && lastRoundData && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                             alignItems: 'center', justifyContent: 'center', background: 'rgba(255,0,0,0.15)',
                             pointerEvents: 'none' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: '#ff2222', textShadow: '0 0 30px #ff0000' }}>
                  🪤 RUG PULL!
                </div>
                <div style={{ fontSize: 16, color: '#ff8888', marginTop: 4 }}>
                  at {parseFloat(lastRoundData.rugPoint).toFixed(2)}x
                </div>
                {lastRoundData.lastThreeOut?.length > 0 && (
                  <div style={{ marginTop: 8, background: 'rgba(0,0,0,0.7)', padding: '8px 16px', borderRadius: 8 }}>
                    {lastRoundData.lastThreeOut.map((w: BonusWinner, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: '#ff8c00' }}>
                        {['🏆', '🥈', '🥉'][i]} {w.username} +${w.bonus.toFixed(2)} bonus
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right — Players list */}
          <div style={{ width: 180, minWidth: 160, borderLeft: '1px solid #1a1a1a',
                         maxHeight: 340, overflowY: 'auto', padding: 8 }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 6 }}>PLAYERS</div>

            {/* Last out bonus info */}
            <div style={{ background: '#111', borderRadius: 6, padding: '6px 8px', marginBottom: 8, fontSize: 10 }}>
              <div style={{ color: '#ff8c00', fontWeight: 700, marginBottom: 2 }}>LAST OUT BONUS</div>
              <div style={{ color: '#aaa' }}>🏆 1st last: <span style={{ color: '#ff8c00' }}>50%</span> of lost pool</div>
              <div style={{ color: '#aaa' }}>🥈 2nd last: <span style={{ color: '#ff8c00' }}>30%</span></div>
              <div style={{ color: '#aaa' }}>🥉 3rd last: <span style={{ color: '#ff8c00' }}>20%</span></div>
            </div>

            {sortedBets.map((b, i) => {
              const rank = lastThreeOut.findIndex(x => x.username === b.username)
              const medal = ['🏆', '🥈', '🥉'][rank] ?? ''
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                       padding: '4px 0', borderBottom: '1px solid #111', fontSize: 12 }}>
                  <span style={{ color: b.cashedOut ? '#22cc44' : '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 90 }}>
                    {medal} {b.username}
                  </span>
                  <span style={{ color: b.cashedOut ? '#22cc44' : '#ccc', fontSize: 11 }}>
                    {b.cashedOut ? `×${b.cashoutAt?.toFixed(2)}` : `$${b.amount.toFixed(2)}`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom panel */}
        <div style={{ padding: 16, borderTop: '1px solid #1a1a1a', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {/* Bet controls */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>BET AMOUNT</div>
                <input value={betInput} onChange={e => setBetInput(e.target.value)}
                  disabled={status !== 'betting' || myBet !== null}
                  style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 6,
                           color: '#fff', padding: '8px 10px', fontSize: 14, boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
                {['½', '2×'].map(label => (
                  <button key={label} onClick={() => {
                    const v = parseFloat(betInput) || 0
                    setBetInput(label === '½' ? (v / 2).toFixed(2) : (v * 2).toFixed(2))
                  }} style={{ padding: '8px 8px', background: '#1a1a1a', border: '1px solid #333',
                               borderRadius: 6, color: '#aaa', cursor: 'pointer', fontSize: 12 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto cashout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={autoCashoutEnabled} onChange={e => setAutoCashoutEnabled(e.target.checked)} />
                Auto cashout at
              </label>
              <input value={autoCashoutInput} onChange={e => setAutoCashoutInput(e.target.value)}
                disabled={!autoCashoutEnabled}
                placeholder="2.00"
                style={{ width: 70, background: '#111', border: '1px solid #333', borderRadius: 6,
                         color: '#fff', padding: '4px 8px', fontSize: 13 }} />
              <span style={{ fontSize: 12, color: '#555' }}>x</span>
            </div>

            {status === 'betting' && myBet === null && (
              <button onClick={placeBet}
                style={{ width: '100%', padding: '12px', background: '#ff8c00', border: 'none',
                         borderRadius: 8, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
                JOIN — ${betInput}
              </button>
            )}

            {status === 'betting' && myBet !== null && (
              <div style={{ padding: 12, background: '#1a1a00', border: '1px solid #ff8c00',
                             borderRadius: 8, textAlign: 'center', color: '#ff8c00', fontWeight: 700 }}>
                ✓ Joined — ${myBet.toFixed(2)} · Waiting for round...
              </div>
            )}

            {status === 'running' && myBet !== null && myCashoutAt === null && (
              <button onClick={doCashout}
                style={{ width: '100%', padding: '12px', background: '#22cc44', border: 'none',
                         borderRadius: 8, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}>
                💰 Cash Out ${(myBet * multiplier * 0.95).toFixed(2)} · Hold for bonus! 🎯
              </button>
            )}

            {status === 'running' && myBet !== null && myCashoutAt !== null && (
              <div style={{ padding: 12, background: '#001a00', border: '1px solid #22cc44',
                             borderRadius: 8, textAlign: 'center' }}>
                <div style={{ color: '#22cc44', fontWeight: 700 }}>✓ Cashed Out at {myCashoutAt.toFixed(2)}x</div>
                <div style={{ color: '#aaa', fontSize: 13 }}>+${myPayout?.toFixed(2)}</div>
                {myCashoutOrder !== null && (
                  <div style={{ color: '#ff8c00', fontSize: 12, marginTop: 4 }}>
                    You're #{myCashoutOrder} out — hold for bonus! 🎯
                  </div>
                )}
              </div>
            )}

            {status === 'running' && myBet === null && (
              <div style={{ padding: 12, background: '#111', borderRadius: 8, textAlign: 'center', color: '#555' }}>
                Round in progress — join next round
              </div>
            )}

            {status === 'pulled' && (
              <div style={{ padding: 12, background: didLose ? '#1a0000' : '#001a00',
                             border: `1px solid ${didLose ? '#ff4444' : '#22cc44'}`, borderRadius: 8, textAlign: 'center' }}>
                {didLose && <div style={{ color: '#ff4444', fontWeight: 700 }}>🪤 Rug pulled — you lost</div>}
                {!didLose && myCashoutAt !== null && (
                  <>
                    <div style={{ color: '#22cc44', fontWeight: 700 }}>✓ Cashed out at {myCashoutAt.toFixed(2)}x</div>
                    <div style={{ color: '#aaa', fontSize: 13 }}>Base: +${myPayout?.toFixed(2)}</div>
                    {myBonus !== null && myBonus > 0 && (
                      <div style={{ color: '#ff8c00', fontWeight: 700 }}>🏆 Bonus: +${myBonus.toFixed(2)}</div>
                    )}
                  </>
                )}
                {!didLose && myBet === null && <div style={{ color: '#555' }}>You didn't play this round</div>}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ minWidth: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ background: '#111', borderRadius: 8, padding: '10px 14px' }}>
              <div style={{ fontSize: 10, color: '#555' }}>BALANCE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ff8c00' }}>${balance.toFixed(2)}</div>
            </div>
            {lastRoundData && (
              <div style={{ background: '#111', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                <div style={{ color: '#555', marginBottom: 4 }}>LAST ROUND</div>
                <div style={{ color: '#ff4444' }}>Rug: {parseFloat(lastRoundData.rugPoint).toFixed(2)}x</div>
                <div style={{ color: '#aaa' }}>Pool: ${parseFloat(lastRoundData.totalPool).toFixed(2)}</div>
                <div style={{ color: '#ff4444' }}>Lost: ${parseFloat(lastRoundData.lostPool).toFixed(2)}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Provably Fair tab */}
      <div style={{ display: tab === 'fair' ? undefined : 'none', padding: 20 }}>
        <h3 style={{ color: '#ff8c00', marginTop: 0 }}>Provably Fair</h3>
        <p style={{ color: '#888', fontSize: 14 }}>
          Rug Pull использует HMAC-SHA256 для генерации точки rug pull. Server seed хешируется и раскрывается только после раунда.
        </p>
        <div style={{ background: '#111', borderRadius: 8, padding: 16, fontSize: 13, color: '#aaa' }}>
          <div style={{ marginBottom: 8 }}><strong style={{ color: '#ff8c00' }}>Алгоритм:</strong></div>
          <code style={{ color: '#ccc' }}>
            hmac = HMAC-SHA256(serverSeed, clientSeed)<br />
            h = parseInt(hmac.slice(0, 8), 16)<br />
            rugPoint = floor((100×2³² - h) / (2³² - h) × 0.95) / 100
          </code>
          <div style={{ marginTop: 12, color: '#666', fontSize: 12 }}>
            5% шанс мгновенного rug (когда h % 20 === 0)
          </div>
        </div>
        <div style={{ marginTop: 16, color: '#666', fontSize: 13 }}>
          Для верификации раунда используй:<br />
          <code style={{ color: '#ff8c00' }}>GET /api/rugpull/verify/:roundId</code>
        </div>
      </div>

      {/* Help modal */}
      {showHelp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex',
                       alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowHelp(false)}>
          <div style={{ background: '#141414', border: '1px solid #2a2a2a', borderRadius: 16,
                         padding: 28, maxWidth: 420, width: '90%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: '#ff8c00', marginTop: 0 }}>🪤 Rug Pull — Правила</h3>
            <ul style={{ color: '#bbb', fontSize: 14, lineHeight: 1.7, paddingLeft: 20 }}>
              <li><b>Фаза ставок (30 сек)</b> — делай ставку в общий пул</li>
              <li><b>Множитель растёт</b> — выходи в любой момент</li>
              <li><b>Rug Pull</b> — в случайный момент всё обрывается</li>
              <li>Те кто не вышел — теряют ставку</li>
              <li><b>Последние 3 вышедших</b> получают бонус из потерянного пула:</li>
              <li style={{ listStyle: 'none' }}>🏆 Последний = 50% · 🥈 = 30% · 🥉 = 20%</li>
              <li>Казино берёт 5% от всего пула</li>
              <li>Минимум 2 игрока для старта раунда</li>
            </ul>
            <div style={{ color: '#ff8c00', fontSize: 13, marginTop: 8 }}>
              💡 Стратегия: держись дольше всех — получишь деньги проигравших!
            </div>
            <button onClick={() => setShowHelp(false)}
              style={{ marginTop: 16, width: '100%', padding: 10, background: '#ff8c00',
                       border: 'none', borderRadius: 8, color: '#000', fontWeight: 700, cursor: 'pointer' }}>
              Понятно
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
