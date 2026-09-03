import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'
import { getBalance, getTransactions, withdraw, getDepositAddress, getDepositHistory } from '../api/wallet'

const txColor: Record<string, string> = { deposit: '#22c55e', withdrawal: '#ef4444', bet: '#555', win: '#e4a832' }

const COINS = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: '#f7931a' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: '#627eea' },
  { symbol: 'USDT', name: 'Tether', icon: '₮', color: '#26a17b' },
  { symbol: 'USDC', name: 'USD Coin', icon: '$', color: '#2775ca' },
  { symbol: 'LTC', name: 'Litecoin', icon: 'Ł', color: '#bfbbbb' },
  { symbol: 'SOL', name: 'Solana', icon: '◎', color: '#9945ff' },
]

interface Tx {
  id: string; type: string; description?: string; label?: string
  amount: number; createdAt?: string; date?: string; status: string
}

interface DepositAddr {
  coin: string; address: string; qr: string; confirmations: number; name: string
}

interface CryptoDeposit {
  id: string; coin: string; tx_hash: string; amount: string; amount_usd: string; status: string; credited: boolean; created_at: string
}

type Tab = 'overview' | 'deposit' | 'withdraw' | 'history'

export default function Wallet() {
  const { t } = useTranslation()
  const { balance, setBalance } = useAuthStore()
  const { addToast } = useUIStore()
  const [tab, setTab] = useState<Tab>('overview')
  const [txs, setTxs] = useState<Tx[]>([])
  const [txLoading, setTxLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', coin: 'USDT', destination: '' })
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  const [selectedCoin, setSelectedCoin] = useState<string | null>(null)
  const [depositAddr, setDepositAddr] = useState<DepositAddr | null>(null)
  const [depositLoading, setDepositLoading] = useState(false)
  const [cryptoDeposits, setCryptoDeposits] = useState<CryptoDeposit[]>([])

  useEffect(() => {
    getBalance().then((r) => setBalance(r.data?.balance ?? 0)).catch(() => {})
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

  useEffect(() => {
    if (tab === 'history') {
      getDepositHistory().then((r) => setCryptoDeposits(r.data?.deposits || [])).catch(() => {})
    }
  }, [tab])

  const handleCoinSelect = async (symbol: string) => {
    setSelectedCoin(symbol)
    setDepositAddr(null)
    setDepositLoading(true)
    try {
      const r = await getDepositAddress(symbol)
      setDepositAddr(r.data)
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed to get address', 'error')
      setSelectedCoin(null)
    } finally { setDepositLoading(false) }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawForm.amount)
    if (!amount || amount < 10) { addToast('Minimum withdrawal is $10', 'error'); return }
    if (amount > balance) { addToast('Insufficient balance', 'error'); return }
    if (!withdrawForm.destination) { addToast(t('wallet.address'), 'error'); return }
    setWithdrawLoading(true)
    try {
      await withdraw(amount, withdrawForm.coin, withdrawForm.destination)
      addToast(t('wallet.withdrawSuccess'), 'success')
      setWithdrawForm({ amount: '', coin: 'USDT', destination: '' })
      const balRes = await getBalance()
      setBalance(balRes.data?.balance ?? 0)
      setPage(1)
    } catch (err: any) {
      addToast(err.response?.data?.error || t('common.failed'), 'error')
    } finally { setWithdrawLoading(false) }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: t('wallet.balance') },
    { id: 'deposit', label: t('wallet.deposit') },
    { id: 'withdraw', label: t('wallet.withdraw') },
    { id: 'history', label: t('wallet.transactions') },
  ]

  return (
    <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{t('wallet.balance')}</h1>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4 }}>
        {TABS.map((t2) => (
          <button key={t2.id} onClick={() => setTab(t2.id)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
              background: tab === t2.id ? '#e4a832' : 'transparent',
              color: tab === t2.id ? '#000' : 'var(--text3)' }}>
            {t2.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 28, marginBottom: 16, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1, marginBottom: 8 }}>{t('wallet.balance').toUpperCase()}</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#e4a832', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>${balance.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>≈ {(balance / 42000).toFixed(6)} BTC</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
                <button onClick={() => setTab('deposit')} style={{ padding: '10px 28px', borderRadius: 8, background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer' }}>
                  {t('wallet.deposit')}
                </button>
                <button onClick={() => setTab('withdraw')} style={{ padding: '10px 28px', borderRadius: 8, background: 'var(--bg2)', color: 'var(--text3)', fontWeight: 600, fontSize: 13, border: '1px solid var(--border)', cursor: 'pointer' }}>
                  {t('wallet.withdraw')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'deposit' && (
          <motion.div key="deposit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {!selectedCoin ? (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Select a coin to deposit:</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {COINS.map((c) => (
                    <motion.button key={c.symbol} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => handleCoinSelect(c.symbol)}
                      style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 14px', cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 28, color: c.color, fontWeight: 900 }}>{c.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{c.symbol}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{c.name}</div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : depositLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>{t('common.loading')}</div>
            ) : depositAddr ? (
              <div style={{ maxWidth: 440, margin: '0 auto' }}>
                <button onClick={() => { setSelectedCoin(null); setDepositAddr(null) }}
                  style={{ background: 'none', border: 'none', color: '#e4a832', fontSize: 12, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
                  ← Back to coins
                </button>
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{depositAddr.name} Deposit</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 20 }}>
                    Send only {depositAddr.coin} to this address. Requires {depositAddr.confirmations} confirmation{depositAddr.confirmations !== 1 ? 's' : ''}.
                  </div>
                  {depositAddr.qr && (
                    <div style={{ background: '#fff', display: 'inline-block', padding: 12, borderRadius: 10, marginBottom: 16 }}>
                      <img src={depositAddr.qr} alt="QR Code" style={{ width: 180, height: 180, display: 'block' }} />
                    </div>
                  )}
                  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', wordBreak: 'break-all', color: '#e4a832', marginBottom: 12 }}>
                    {depositAddr.address}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(depositAddr.address); addToast('Address copied!', 'success') }}
                    style={{ padding: '9px 24px', borderRadius: 8, background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 12, border: 'none', cursor: 'pointer' }}>
                    Copy Address
                  </button>
                  <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text3)', lineHeight: 1.6 }}>
                    Your balance will be credited automatically after confirmation. Minimum deposit: any amount. Funds are credited in USD at current market rate.
                  </div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}

        {tab === 'withdraw' && (
          <motion.div key="withdraw" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div style={{ maxWidth: 440, margin: '0 auto', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>{t('wallet.withdraw')}</div>
              <form onSubmit={handleWithdraw} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 8 }}>Coin</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {COINS.map((c) => (
                      <button key={c.symbol} type="button" onClick={() => setWithdrawForm((f) => ({ ...f, coin: c.symbol }))}
                        style={{ padding: '10px 6px', borderRadius: 8, border: withdrawForm.coin === c.symbol ? '2px solid #e4a832' : '1px solid var(--border)',
                          background: withdrawForm.coin === c.symbol ? 'rgba(228,168,50,0.1)' : 'var(--bg2)', cursor: 'pointer', textAlign: 'center' }}>
                        <div style={{ fontSize: 18 }}>{c.icon}</div>
                        <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, marginTop: 2 }}>{c.symbol}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>{t('wallet.amount')} (USD)</label>
                  <div style={{ position: 'relative' }}>
                    <input value={withdrawForm.amount} type="number" placeholder="100" min="10" step="0.01"
                      onChange={(e) => setWithdrawForm((f) => ({ ...f, amount: e.target.value }))}
                      style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 12px', paddingRight: 60, color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    <button type="button" onClick={() => setWithdrawForm((f) => ({ ...f, amount: balance.toFixed(2) }))}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: '#e4a832', color: '#000', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                      MAX
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Min: $10.00 · Available: <span style={{ color: '#e4a832', fontWeight: 700 }}>${balance.toFixed(2)}</span></div>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>{withdrawForm.coin} {t('wallet.address')}</label>
                  <input value={withdrawForm.destination} type="text" placeholder={withdrawForm.coin === 'SOL' ? 'So1...' : withdrawForm.coin === 'BTC' ? 'bc1...' : withdrawForm.coin === 'LTC' ? 'L...' : '0x...'}
                    onChange={(e) => setWithdrawForm((f) => ({ ...f, destination: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 7, padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <button type="submit" disabled={withdrawLoading}
                  style={{ background: '#e4a832', color: '#000', fontWeight: 800, border: 'none', borderRadius: 8, padding: '11px', fontSize: 13, cursor: 'pointer', opacity: withdrawLoading ? 0.7 : 1 }}>
                  {withdrawLoading ? t('common.loading') : t('wallet.withdraw')}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {tab === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {/* Crypto deposits */}
            {cryptoDeposits.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Crypto Deposits</div>
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {cryptoDeposits.map((d) => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border2)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{d.coin} Deposit</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace', marginTop: 2 }}>{d.tx_hash.slice(0, 20)}...</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{new Date(d.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: '#22c55e' }}>+${Number(d.amount_usd).toFixed(2)}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{Number(d.amount).toFixed(6)} {d.coin}</div>
                        <div style={{ fontSize: 9, marginTop: 2, color: d.credited ? '#22c55e' : '#f59e0b' }}>{d.credited ? 'credited' : d.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction history */}
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>{t('wallet.transactions')}</div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {txLoading && page === 1 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>{t('common.loading')}</div>
              ) : txs.length === 0 ? (
                <div style={{ padding: 30, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>{t('wallet.noTransactions')}</div>
              ) : (
                <>
                  {txs.map((tx) => {
                    const label = tx.description || tx.label || tx.type
                    const date = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : tx.date || ''
                    const color = txColor[tx.type] || '#555'
                    return (
                      <div key={tx.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: '1px solid var(--border2)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                          {tx.type === 'deposit' ? '↓' : tx.type === 'withdrawal' ? '↑' : tx.type === 'win' ? '★' : '◆'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{date}</div>
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
                      {txLoading ? t('common.loading') : 'Load more'}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
