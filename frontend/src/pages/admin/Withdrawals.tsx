import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { getWithdrawals, approveWithdrawal, rejectWithdrawal } from '../../api/admin'
import { useUIStore } from '../../store/useUIStore'

interface Wr {
  id: string
  user_id: string
  username?: string
  email?: string
  amount: number
  method: string
  destination: string
  status: string
  created_at: string
  reason?: string
  tx_hash?: string
}

const statusColor: Record<string, string> = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' }

function WithdrawalModal({ w, onClose, onApprove, onReject }: { w: Wr; onClose: () => void; onApprove: (id: string, txHash: string) => void; onReject: (id: string, reason: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [txHash, setTxHash] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [view, setView] = useState<'detail' | 'reject'>('detail')

  useEffect(() => {
    if (w.destination && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, w.destination, { width: 160, margin: 1, color: { dark: '#000', light: '#fff' } }).catch(() => {})
    }
  }, [w.destination])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}>
      <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 16, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>💸 Детали вывода</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Amount + status */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#ef4444' }}>${Number(w.amount).toFixed(2)}</div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>{w.method || '—'}</div>
            <span style={{ fontSize: 12, color: statusColor[w.status], background: statusColor[w.status] + '20', padding: '4px 12px', borderRadius: 20, fontWeight: 700 }}>
              {w.status.toUpperCase()}
            </span>
          </div>

          {/* Info rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {[
              ['Игрок', w.username || w.email || '—'],
              ['User ID', w.user_id],
              ['ID вывода', w.id],
              ['Дата', new Date(w.created_at).toLocaleString('ru')],
              ...(w.reason ? [['Причина отклонения', w.reason]] : []),
              ...(w.tx_hash ? [['TX Hash', w.tx_hash]] : []),
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 14px', background: '#111', borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#ccc', wordBreak: 'break-all', textAlign: 'right' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Wallet QR */}
          {w.destination && (
            <div style={{ background: '#111', borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>Адрес кошелька</div>
              <canvas ref={canvasRef} style={{ borderRadius: 8, display: 'block', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 11, color: '#888', wordBreak: 'break-all', marginBottom: 10 }}>{w.destination}</div>
              <button
                onClick={() => navigator.clipboard?.writeText(w.destination).then(() => alert('Скопировано!'))}
                style={{ fontSize: 11, padding: '6px 16px', borderRadius: 6, background: '#222', color: '#e4a832', border: '1px solid #333', cursor: 'pointer' }}
              >
                📋 Копировать
              </button>
            </div>
          )}

          {/* Actions for pending */}
          {w.status === 'pending' && view === 'detail' && (
            <>
              <input
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="TX Hash (опционально)"
                style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => onApprove(w.id, txHash)}
                  style={{ flex: 1, background: '#22c55e', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '12px', cursor: 'pointer', fontSize: 14 }}>
                  ✅ Одобрить
                </button>
                <button onClick={() => setView('reject')}
                  style={{ flex: 1, background: '#ef4444', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '12px', cursor: 'pointer', fontSize: 14 }}>
                  ❌ Отклонить
                </button>
              </div>
            </>
          )}

          {w.status === 'pending' && view === 'reject' && (
            <>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Причина отклонения..."
                style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setView('detail')}
                  style={{ flex: 1, background: '#222', color: '#888', border: '1px solid #333', borderRadius: 8, padding: '12px', cursor: 'pointer' }}>
                  Назад
                </button>
                <button onClick={() => onReject(w.id, rejectReason)}
                  style={{ flex: 1, background: '#ef4444', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '12px', cursor: 'pointer' }}>
                  Подтвердить отклонение
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminWithdrawals() {
  const [wrs, setWrs] = useState<Wr[]>([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Wr | null>(null)
  const { addToast } = useUIStore()

  const load = (s = filter) => {
    setLoading(true)
    getWithdrawals(s).then((r) => setWrs(r.data.withdrawals || [])).catch(() => addToast('Failed', 'error')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleApprove = async (id: string, txHash: string) => {
    try {
      await approveWithdrawal(id, txHash)
      addToast('Withdrawal approved', 'success')
      setSelected(null)
      load()
    } catch { addToast('Failed to approve', 'error') }
  }

  const handleReject = async (id: string, reason: string) => {
    try {
      await rejectWithdrawal(id, reason || 'Rejected by admin')
      addToast('Withdrawal rejected', 'success')
      setSelected(null)
      load()
    } catch { addToast('Failed to reject', 'error') }
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Withdrawals</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['pending', 'approved', 'rejected', ''].map((s) => (
          <button key={s || 'all'} onClick={() => setFilter(s)}
            style={{ padding: '7px 16px', borderRadius: 7, border: '1px solid #2a2a2a', background: filter === s ? '#e4a832' : '#1a1a1a', color: filter === s ? '#000' : '#888', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {['User', 'Amount', 'Method', 'Destination', 'Status', 'Date', ''].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#444', fontSize: 11, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#444' }}>Loading...</td></tr>
              : wrs.length === 0
              ? <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#444' }}>No withdrawals</td></tr>
              : wrs.map((w, i) => (
                <tr key={w.id}
                  onClick={() => setSelected(w)}
                  style={{ borderBottom: '1px solid #111', background: i % 2 === 0 ? 'transparent' : '#0d0d0d', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#222')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#0d0d0d')}
                >
                  <td style={{ padding: '12px 16px', color: '#888' }}>{w.username || w.email || w.user_id.slice(0, 8) + '...'}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>${Number(w.amount).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>{w.method || '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#555', fontSize: 11 }}>
                    {w.destination ? w.destination.slice(0, 16) + '...' : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, color: statusColor[w.status], background: statusColor[w.status] + '15', padding: '3px 8px', borderRadius: 20 }}>
                      {w.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#444', fontSize: 11 }}>{new Date(w.created_at).toLocaleDateString('ru')}</td>
                  <td style={{ padding: '12px 16px', color: '#555', fontSize: 11 }}>→</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <WithdrawalModal
          w={selected}
          onClose={() => setSelected(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  )
}
