import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'
import { getBalance, getTransactions, withdraw } from '../api/wallet'

const txColor: Record<string, string> = { deposit: '#22c55e', withdrawal: '#ef4444', bet: '#555', win: '#e4a832' }

interface Tx {
  id: string
  type: string
  description?: string
  label?: string
  amount: number
  createdAt?: string
  date?: string
  status: string
}

export default function Wallet() {
  const { balance, setBalance } = useAuthStore()
  const { addToast } = useUIStore()
  const [txs, setTxs] = useState<Tx[]>([])
  const [txLoading, setTxLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'USDT', destination: '' })
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  useEffect(() => {
    getBalance()
      .then((r) => setBalance(r.data?.balance ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setTxLoading(true)
    getTransactions(page)
      .then((r) => {
        const data = r.data?.transactions || r.data?.data || []
        setTxs((prev) => page === 1 ? data : [...prev, ...data])
        setHasMore(data.length === 20)
      })
      .catch(() => setTxs([]))
      .finally(() => setTxLoading(false))
  }, [page])

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawForm.amount)
    if (!amount || amount <= 0) { addToast('Enter valid amount', 'error'); return }
    if (amount > balance) { addToast('Insufficient balance', 'error'); return }
    if (!withdrawForm.destination) { addToast('Enter destination address', 'error'); return }
    setWithdrawLoading(true)
    try {
      await withdraw(amount, withdrawForm.method, withdrawForm.destination)
      addToast('Withdrawal requested!', 'success')
      setWithdrawModal(false)
      const balRes = await getBalance()
      setBalance(balRes.data?.balance ?? 0)
      setPage(1)
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Withdrawal failed', 'error')
    } finally { setWithdrawLoading(false) }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 20 }}>
      {/* Left */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 10, color: '#444', letterSpacing: 1, marginBottom: 8 }}>TOTAL BALANCE</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#e4a832', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>${balance.toFixed(2)}</div>
          <div style={{ fontSize: 11, color: '#444', marginBottom: 16 }}>≈ {(balance / 42000).toFixed(6)} BTC</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => addToast('Contact support to deposit', 'success')}
              style={{ flex: 1, background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 12, padding: '9px', borderRadius: 7, border: 'none' }}>Deposit</button>
            <button onClick={() => setWithdrawModal(true)}
              style={{ flex: 1, background: '#1e1e1e', color: '#888', fontWeight: 600, fontSize: 12, padding: '9px', borderRadius: 7, border: '1px solid #2a2a2a' }}>Withdraw</button>
          </div>
        </motion.div>
      </div>

      {/* Right — transactions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #222', fontSize: 12, fontWeight: 700 }}>Transaction History</div>
        {txLoading && page === 1 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#444', fontSize: 12 }}>Loading...</div>
        ) : txs.length === 0 ? (
          <div style={{ padding: 30, textAlign: 'center', color: '#444', fontSize: 12 }}>No transactions yet</div>
        ) : (
          <>
            {txs.map((tx) => {
              const label = tx.description || tx.label || tx.type
              const date = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : tx.date || ''
              const color = txColor[tx.type] || '#555'
              return (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid #1e1e1e' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                    {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : tx.type === 'win' ? '🏆' : '🎲'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                    <div style={{ fontSize: 10, color: '#444', marginTop: 2 }}>{date}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color }}>{tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}</div>
                    <div style={{ fontSize: 9, color: tx.status === 'completed' ? '#22c55e' : '#f59e0b', marginTop: 2 }}>{tx.status}</div>
                  </div>
                </div>
              )
            })}
            {hasMore && (
              <button onClick={() => setPage((p) => p + 1)} disabled={txLoading}
                style={{ width: '100%', padding: '12px', background: 'none', border: 'none', color: '#e4a832', fontSize: 12, cursor: 'pointer' }}>
                {txLoading ? 'Loading...' : 'Load more'}
              </button>
            )}
          </>
        )}
      </motion.div>

      {/* Withdraw modal */}
      {withdrawModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}
          onClick={() => setWithdrawModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: 24, width: 340 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>Withdraw Funds</div>
            <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Amount (USD)', key: 'amount', type: 'number', ph: '100' },
                { label: 'Destination Address', key: 'destination', type: 'text', ph: '0x...' },
              ].map(({ label, key, type, ph }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>{label}</label>
                  <input value={withdrawForm[key as keyof typeof withdrawForm]} type={type} placeholder={ph}
                    onChange={(e) => setWithdrawForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => setWithdrawModal(false)}
                  style={{ flex: 1, background: '#111', color: '#888', border: '1px solid #2a2a2a', borderRadius: 7, padding: '10px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={withdrawLoading}
                  style={{ flex: 1, background: '#e4a832', color: '#000', fontWeight: 800, border: 'none', borderRadius: 7, padding: '10px', fontSize: 12, cursor: 'pointer', opacity: withdrawLoading ? 0.7 : 1 }}>
                  {withdrawLoading ? 'Processing...' : 'Withdraw'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
