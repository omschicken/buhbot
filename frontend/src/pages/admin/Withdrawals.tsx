import { useEffect, useState } from 'react'
import { getWithdrawals, approveWithdrawal, rejectWithdrawal } from '../../api/admin'
import { useUIStore } from '../../store/useUIStore'

interface Wr { id: string; user_id: string; amount: number; method: string; destination: string; status: string; created_at: string }

const statusColor: Record<string, string> = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' }

export default function AdminWithdrawals() {
  const [wrs, setWrs] = useState<Wr[]>([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const { addToast } = useUIStore()

  const load = (s = filter) => {
    setLoading(true)
    getWithdrawals(s).then((r) => setWrs(r.data.withdrawals || [])).catch(() => addToast('Failed', 'error')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this withdrawal?')) return
    await approveWithdrawal(id)
    addToast('Approved', 'success')
    load()
  }

  const handleReject = async () => {
    if (!rejectModal) return
    await rejectWithdrawal(rejectModal, rejectReason)
    addToast('Rejected', 'success')
    setRejectModal(null)
    setRejectReason('')
    load()
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
              {['User', 'Amount', 'Method', 'Destination', 'Status', 'Date', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#444', fontSize: 11, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#444' }}>Loading...</td></tr>
              : wrs.length === 0 ? <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#444' }}>No withdrawals</td></tr>
              : wrs.map((w, i) => (
                <tr key={w.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'transparent' : '#0d0d0d' }}>
                  <td style={{ padding: '12px 16px', color: '#888' }}>{w.user_id.slice(0, 8)}...</td>
                  <td style={{ padding: '12px 16px', fontWeight: 700 }}>${Number(w.amount).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>{w.method}</td>
                  <td style={{ padding: '12px 16px', color: '#555', fontSize: 11 }}>{w.destination?.slice(0, 20)}...</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, color: statusColor[w.status], background: statusColor[w.status] + '15', padding: '3px 8px', borderRadius: 20 }}>{w.status}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#444', fontSize: 11 }}>{new Date(w.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {w.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => handleApprove(w.id)}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', cursor: 'pointer' }}>Approve</button>
                        <button onClick={() => setRejectModal(w.id)}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', cursor: 'pointer' }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 24, width: 360 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Reject Withdrawal</div>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection"
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setRejectModal(null)} style={{ flex: 1, background: '#111', color: '#888', border: '1px solid #2a2a2a', borderRadius: 7, padding: 10, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleReject} style={{ flex: 1, background: '#ef4444', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 7, padding: 10, cursor: 'pointer' }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
