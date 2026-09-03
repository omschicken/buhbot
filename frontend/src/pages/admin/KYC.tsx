import { useEffect, useState } from 'react'
import { getPendingKYC, reviewKYC } from '../../api/admin'
import { useUIStore } from '../../store/useUIStore'

interface KYCRecord { id: string; user_id: string; level: number; status: string; document_path: string; created_at: string }

export default function AdminKYC() {
  const [records, setRecords] = useState<KYCRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const { addToast } = useUIStore()

  const load = () => {
    setLoading(true)
    getPendingKYC().then((r) => setRecords(r.data.records || [])).catch(() => addToast('Failed', 'error')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleReview = async (userId: string, approved: boolean, reason?: string) => {
    if (!confirm(approved ? 'Approve KYC?' : 'Reject KYC?')) return
    await reviewKYC(userId, approved, 1, reason)
    addToast(approved ? 'KYC approved' : 'KYC rejected', approved ? 'success' : 'error')
    load()
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>KYC Review</h1>

      {loading ? <div style={{ color: '#444' }}>Loading...</div>
        : records.length === 0 ? <div style={{ color: '#444', padding: 40, textAlign: 'center' }}>No pending KYC reviews</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {records.map((r) => (
              <div key={r.id} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>User: {r.user_id}</div>
                    <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>Submitted: {new Date(r.created_at).toLocaleString()}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#f59e0b', background: '#f59e0b15', padding: '3px 8px', borderRadius: 20 }}>{r.status}</span>
                </div>
                {r.document_path && (
                  <div style={{ fontSize: 12, color: '#888', background: '#111', padding: '8px 12px', borderRadius: 6, marginBottom: 12 }}>
                    Document: <code style={{ color: '#e4a832' }}>{r.document_path}</code>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => handleReview(r.user_id, true)}
                    style={{ padding: '8px 20px', borderRadius: 7, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Approve</button>
                  <button onClick={() => setRejectModal(r.user_id)}
                    style={{ padding: '8px 20px', borderRadius: 7, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 12, padding: 24, width: 360 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Reject KYC</div>
            <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason"
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setRejectModal(null)} style={{ flex: 1, background: '#111', color: '#888', border: '1px solid #2a2a2a', borderRadius: 7, padding: 10, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { handleReview(rejectModal, false, rejectReason); setRejectModal(null) }}
                style={{ flex: 1, background: '#ef4444', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 7, padding: 10, cursor: 'pointer' }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
