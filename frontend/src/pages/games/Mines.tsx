import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useUIStore } from '../../store/useUIStore'
import { getBalance } from '../../api/wallet'
import { api } from '../../api/axios'
import ToastContainer from '../../components/ui/Toast'

type Phase = 'idle' | 'playing' | 'exploded' | 'cashed_out'
type CellState = 'hidden' | 'diamond' | 'mine' | 'mine-reveal' | 'exploded-cell'

interface RoundState {
  roundId: string
  serverSeedHash: string
  clientSeed: string
  betAmount: number
  minesCount: number
  openedCells: number[]
  currentMultiplier: number
  nextMultiplierValue: number
  potentialPayout: number
}

const CSS = `
  .mines-page {
    min-height: 100vh;
    background: #0f0f0f;
    color: #e0e0e0;
    font-family: 'Inter', sans-serif;
    display: flex;
    flex-direction: column;
  }
  .mines-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px 24px;
    background: #141414;
    border-bottom: 1px solid #222;
  }
  .mines-back-btn {
    background: none;
    border: 1px solid #333;
    color: #aaa;
    border-radius: 8px;
    padding: 8px 14px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s;
  }
  .mines-back-btn:hover { border-color: #555; color: #fff; }
  .mines-title {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #fff;
    flex: 1;
  }
  .mines-balance {
    font-size: 14px;
    color: #e4a832;
    font-weight: 600;
  }
  .mines-body {
    display: flex;
    flex: 1;
    gap: 20px;
    padding: 24px;
    max-width: 1100px;
    margin: 0 auto;
    width: 100%;
  }
  .mines-panel {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .mines-card {
    background: #141414;
    border: 1px solid #222;
    border-radius: 12px;
    padding: 16px;
  }
  .mines-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #666;
    margin-bottom: 8px;
  }
  .mines-input {
    width: 100%;
    background: #0f0f0f;
    border: 1px solid #333;
    border-radius: 8px;
    color: #fff;
    font-size: 15px;
    padding: 10px 12px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s;
  }
  .mines-input:focus { border-color: #e4a832; }
  .mines-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .bet-quick {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }
  .bet-quick-btn {
    flex: 1;
    min-width: 44px;
    padding: 6px 0;
    background: #1e1e1e;
    border: 1px solid #333;
    color: #aaa;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .bet-quick-btn:hover:not(:disabled) { border-color: #e4a832; color: #e4a832; }
  .bet-quick-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .mines-slider {
    width: 100%;
    accent-color: #e4a832;
    cursor: pointer;
  }
  .mines-slider:disabled { opacity: 0.4; cursor: not-allowed; }
  .mines-quick-row {
    display: flex;
    gap: 6px;
    margin-top: 8px;
  }
  .mines-quick-btn {
    flex: 1;
    padding: 6px 0;
    background: #1e1e1e;
    border: 1px solid #333;
    color: #aaa;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .mines-quick-btn:hover:not(:disabled) { border-color: #555; color: #fff; }
  .mines-quick-btn.active-mine-btn { border-color: #e4a832; color: #e4a832; background: #1a1600; }
  .mines-quick-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .mines-multiplier-display {
    text-align: center;
    padding: 12px 0;
  }
  .mines-multiplier-value {
    font-size: 32px;
    font-weight: 800;
    color: #e4a832;
  }
  .mines-multiplier-label {
    font-size: 11px;
    color: #555;
    margin-top: 2px;
  }
  .mines-next-mult {
    font-size: 12px;
    color: #4db87a;
    margin-top: 4px;
  }
  .mines-potential {
    font-size: 13px;
    color: #aaa;
    margin-top: 4px;
  }
  .mines-bet-btn {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .mines-bet-btn.bet { background: #e4a832; color: #000; }
  .mines-bet-btn.bet:hover:not(:disabled) { background: #f0b83a; transform: translateY(-1px); }
  .mines-bet-btn.cashout { background: #1a6b3c; color: #4db87a; border: 1px solid #2a8a50; }
  .mines-bet-btn.cashout:hover:not(:disabled) { background: #1f8048; }
  .mines-bet-btn.newgame { background: #1a1a2e; color: #8888ff; border: 1px solid #3333aa; }
  .mines-bet-btn.newgame:hover { background: #22223a; }
  .mines-bet-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .mines-pf {
    font-size: 11px;
    color: #555;
  }
  .mines-pf summary { cursor: pointer; color: #666; }
  .mines-pf p { margin: 4px 0; word-break: break-all; font-family: monospace; color: #555; }
  .mines-stats {
    font-size: 12px;
    color: #555;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .mines-stat { background: #0f0f0f; border-radius: 6px; padding: 8px; }
  .mines-stat-val { color: #aaa; font-size: 13px; font-weight: 600; }
  .mines-grid-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mines-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    width: 100%;
    max-width: 520px;
  }
  .mines-cell {
    aspect-ratio: 1;
    border-radius: 10px;
    border: 2px solid #222;
    background: #1a2535;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    cursor: pointer;
    transition: all 0.15s;
    user-select: none;
    position: relative;
    overflow: hidden;
  }
  .mines-cell.clickable:hover {
    border-color: #e4a832;
    background: #1f2e42;
    transform: scale(1.04);
  }
  .mines-cell.diamond {
    background: #0a3a2a;
    border-color: #2a8a50;
    animation: pop-in 0.25s cubic-bezier(0.34,1.56,0.64,1);
  }
  .mines-cell.mine {
    background: #3a0a0a;
    border-color: #8a2020;
  }
  .mines-cell.exploded-cell {
    background: #5a0a0a;
    border-color: #cc2020;
    animation: shake 0.4s ease-out;
  }
  .mines-cell.mine-reveal {
    background: #1e0d0d;
    border-color: #442020;
    opacity: 0.6;
  }
  .mines-cell.hidden { cursor: default; }
  @keyframes pop-in {
    0% { transform: scale(0.5); opacity: 0; }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  .mines-result-banner {
    text-align: center;
    padding: 12px;
    border-radius: 10px;
    font-weight: 700;
    font-size: 15px;
    margin-bottom: 4px;
  }
  .mines-result-banner.win { background: #0a2a1a; color: #4db87a; border: 1px solid #2a5a3a; }
  .mines-result-banner.lose { background: #2a0a0a; color: #e05050; border: 1px solid #5a2020; }
  @media (max-width: 768px) {
    .mines-body { flex-direction: column; padding: 16px; }
    .mines-panel { width: 100%; }
    .mines-grid { max-width: 100%; }
  }
`

export default function MinesGame() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { addToast } = useUIStore()

  const [balance, setBalance] = useState(0)
  const [betAmount, setBetAmount] = useState('1.00')
  const [minesCount, setMinesCount] = useState(3)
  const [phase, setPhase] = useState<Phase>('idle')
  const [round, setRound] = useState<RoundState | null>(null)
  const [cells, setCells] = useState<CellState[]>(Array(25).fill('hidden'))
  const [loading, setLoading] = useState(false)
  const [sessionStats, setSessionStats] = useState({ wagered: 0, profit: 0, rounds: 0, bestMult: 0 })

  const refreshBalance = useCallback(async () => {
    try {
      const b = await getBalance()
      setBalance(b)
    } catch {}
  }, [])

  // On mount: check for active round + load balance
  useEffect(() => {
    refreshBalance()
    if (!token) return
    api.get('/api/mines/active').then(r => {
      const d = r.data?.data
      if (d) {
        setRound(d)
        setPhase('playing')
        setMinesCount(d.minesCount)
        setBetAmount(String(d.betAmount))
        // Restore opened cells
        const restored: CellState[] = Array(25).fill('hidden')
        for (const idx of d.openedCells) restored[idx] = 'diamond'
        setCells(restored)
      }
    }).catch(() => {})
  }, [token, refreshBalance])

  const startGame = async () => {
    const bet = parseFloat(betAmount)
    if (isNaN(bet) || bet <= 0) { addToast('Invalid bet amount', 'error'); return }
    setLoading(true)
    try {
      const r = await api.post('/api/mines/start', { betAmount: bet, minesCount })
      const d = r.data.data
      setRound(d)
      setPhase('playing')
      setCells(Array(25).fill('hidden'))
      await refreshBalance()
    } catch (e: any) {
      addToast(e?.response?.data?.error || 'Failed to start', 'error')
    } finally { setLoading(false) }
  }

  const openCell = async (idx: number) => {
    if (phase !== 'playing' || !round || cells[idx] !== 'hidden' || loading) return
    setLoading(true)
    try {
      const r = await api.post('/api/mines/open', { roundId: round.roundId, cellIndex: idx })
      const d = r.data.data

      if (d.isMine) {
        const next: CellState[] = [...cells]
        next[idx] = 'exploded-cell'
        // reveal all mine positions
        for (const mp of d.minePositions) {
          if (next[mp] === 'hidden') next[mp] = 'mine-reveal'
        }
        setCells(next)
        setPhase('exploded')
        setSessionStats(s => ({ ...s, wagered: s.wagered + round.betAmount, profit: s.profit - round.betAmount, rounds: s.rounds + 1 }))
        addToast(`Boom! Lost $${round.betAmount.toFixed(2)}`, 'error')
        await refreshBalance()
        return
      }

      const next: CellState[] = [...cells]
      next[idx] = 'diamond'
      const updatedRound: RoundState = {
        ...round,
        openedCells: d.openedCells,
        currentMultiplier: d.currentMultiplier,
        nextMultiplierValue: d.nextMultiplierValue ?? round.nextMultiplierValue,
        potentialPayout: d.potentialPayout ?? round.potentialPayout,
      }

      if (d.allOpened) {
        // reveal mines
        for (const mp of d.minePositions) {
          if (next[mp] === 'hidden') next[mp] = 'mine-reveal'
        }
        setCells(next)
        setRound(updatedRound)
        setPhase('cashed_out')
        const prof = d.profit ?? (d.payout - round.betAmount)
        setSessionStats(s => ({
          wagered: s.wagered + round.betAmount,
          profit: s.profit + prof,
          rounds: s.rounds + 1,
          bestMult: Math.max(s.bestMult, d.currentMultiplier),
        }))
        addToast(`Auto cash out! +$${d.payout?.toFixed(2)}`, 'success')
        await refreshBalance()
        return
      }

      setCells(next)
      setRound(updatedRound)
    } catch (e: any) {
      addToast(e?.response?.data?.error || 'Error', 'error')
    } finally { setLoading(false) }
  }

  const cashOut = async () => {
    if (!round || phase !== 'playing' || round.openedCells.length === 0 || loading) return
    setLoading(true)
    try {
      const r = await api.post('/api/mines/cashout', { roundId: round.roundId })
      const d = r.data.data
      const next: CellState[] = [...cells]
      for (const mp of d.minePositions) {
        if (next[mp] === 'hidden') next[mp] = 'mine-reveal'
      }
      setCells(next)
      setPhase('cashed_out')
      const prof = d.profit ?? (d.payout - round.betAmount)
      setSessionStats(s => ({
        wagered: s.wagered + round.betAmount,
        profit: s.profit + prof,
        rounds: s.rounds + 1,
        bestMult: Math.max(s.bestMult, d.multiplier),
      }))
      addToast(`Cashed out! +$${d.payout.toFixed(2)}`, 'success')
      await refreshBalance()
    } catch (e: any) {
      addToast(e?.response?.data?.error || 'Error', 'error')
    } finally { setLoading(false) }
  }

  const newGame = () => {
    setPhase('idle')
    setRound(null)
    setCells(Array(25).fill('hidden'))
  }

  const cellEmoji = (state: CellState) => {
    if (state === 'diamond') return '💎'
    if (state === 'mine' || state === 'exploded-cell') return '💣'
    if (state === 'mine-reveal') return '💣'
    return ''
  }

  const currentMult = round?.currentMultiplier ?? 1.0
  const nextMult = round?.nextMultiplierValue ?? 0
  const potentialPayout = round ? round.betAmount * currentMult : 0

  return (
    <div className="mines-page">
      <style>{CSS}</style>
      <ToastContainer />

      <div className="mines-header">
        <button className="mines-back-btn" onClick={() => navigate('/')}>← Back</button>
        <div className="mines-title">MINES</div>
        <div className="mines-balance">${balance.toFixed(2)}</div>
      </div>

      <div className="mines-body">
        {/* Left panel */}
        <div className="mines-panel">

          {/* Result banner */}
          {phase === 'cashed_out' && (
            <div className="mines-result-banner win">
              Won ${potentialPayout.toFixed(2)} ({currentMult.toFixed(2)}x)
            </div>
          )}
          {phase === 'exploded' && (
            <div className="mines-result-banner lose">
              Exploded! Lost ${round?.betAmount.toFixed(2)}
            </div>
          )}

          {/* Bet amount */}
          <div className="mines-card">
            <div className="mines-label">Bet Amount</div>
            <input
              className="mines-input"
              type="number"
              min="0.01"
              step="0.01"
              value={betAmount}
              onChange={e => setBetAmount(e.target.value)}
              disabled={phase === 'playing'}
            />
            <div className="bet-quick">
              {['½', '2x', 'Min', 'Max'].map(label => (
                <button
                  key={label}
                  className="bet-quick-btn"
                  disabled={phase === 'playing'}
                  onClick={() => {
                    const cur = parseFloat(betAmount) || 1
                    if (label === '½') setBetAmount((cur / 2).toFixed(2))
                    else if (label === '2x') setBetAmount((cur * 2).toFixed(2))
                    else if (label === 'Min') setBetAmount('0.01')
                    else if (label === 'Max') setBetAmount('10000')
                  }}
                >{label}</button>
              ))}
            </div>
          </div>

          {/* Mines count */}
          <div className="mines-card">
            <div className="mines-label">Mines: {minesCount}</div>
            <input
              className="mines-slider"
              type="range"
              min={1}
              max={24}
              value={minesCount}
              onChange={e => setMinesCount(Number(e.target.value))}
              disabled={phase === 'playing'}
            />
            <div className="mines-quick-row">
              {[1, 3, 5, 10, 24].map(n => (
                <button
                  key={n}
                  className={`mines-quick-btn${minesCount === n ? ' active-mine-btn' : ''}`}
                  disabled={phase === 'playing'}
                  onClick={() => setMinesCount(n)}
                >{n}</button>
              ))}
            </div>
          </div>

          {/* Multiplier */}
          <div className="mines-card">
            <div className="mines-multiplier-display">
              <div className="mines-multiplier-value">{currentMult.toFixed(2)}x</div>
              <div className="mines-multiplier-label">Current Multiplier</div>
              {phase === 'playing' && nextMult > 0 && (
                <div className="mines-next-mult">Next: {nextMult.toFixed(2)}x</div>
              )}
              {phase === 'playing' && round && round.openedCells.length > 0 && (
                <div className="mines-potential">Payout: ${potentialPayout.toFixed(2)}</div>
              )}
            </div>
          </div>

          {/* Action button */}
          {phase === 'idle' && (
            <button className="mines-bet-btn bet" onClick={startGame} disabled={loading}>
              {loading ? 'PLACING BET...' : 'BET'}
            </button>
          )}
          {phase === 'playing' && (
            <button
              className="mines-bet-btn cashout"
              onClick={cashOut}
              disabled={loading || !round || round.openedCells.length === 0}
            >
              {loading ? '...' : `CASH OUT $${potentialPayout.toFixed(2)}`}
            </button>
          )}
          {(phase === 'exploded' || phase === 'cashed_out') && (
            <button className="mines-bet-btn newgame" onClick={newGame}>NEW GAME</button>
          )}

          {/* Provably fair */}
          {round && (
            <div className="mines-card">
              <details className="mines-pf">
                <summary>Provably Fair</summary>
                <p><b>Server Hash:</b> {round.serverSeedHash}</p>
                <p><b>Client Seed:</b> {round.clientSeed}</p>
              </details>
            </div>
          )}

          {/* Session stats */}
          <div className="mines-card">
            <div className="mines-label">Session</div>
            <div className="mines-stats">
              <div className="mines-stat">
                <div className="mines-label">Wagered</div>
                <div className="mines-stat-val">${sessionStats.wagered.toFixed(2)}</div>
              </div>
              <div className="mines-stat">
                <div className="mines-label">Profit</div>
                <div className="mines-stat-val" style={{ color: sessionStats.profit >= 0 ? '#4db87a' : '#e05050' }}>
                  {sessionStats.profit >= 0 ? '+' : ''}${sessionStats.profit.toFixed(2)}
                </div>
              </div>
              <div className="mines-stat">
                <div className="mines-label">Rounds</div>
                <div className="mines-stat-val">{sessionStats.rounds}</div>
              </div>
              <div className="mines-stat">
                <div className="mines-label">Best</div>
                <div className="mines-stat-val">{sessionStats.bestMult > 0 ? `${sessionStats.bestMult.toFixed(2)}x` : '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="mines-grid-wrap">
          <div className="mines-grid">
            {cells.map((state, idx) => (
              <div
                key={idx}
                className={`mines-cell ${state} ${phase === 'playing' && state === 'hidden' ? 'clickable' : ''}`}
                onClick={() => openCell(idx)}
              >
                {cellEmoji(state)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
