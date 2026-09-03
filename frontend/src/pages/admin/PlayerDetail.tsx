import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPlayer, setPlayerStatus, adjustBalance, addNote } from '../../api/admin'
import { useUIStore } from '../../store/useUIStore'

const statusColor: Record<string, string> = { active: '#22c55e', suspended: '#f59e0b', banned: '#ef4444' }

export default function AdminPlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { addToast } = useUIStore()
  const [player, setPlayer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [adjForm, setAdjForm] = useState({ amount: '', type: 'credit', reason: '' })
  const [adjLoading, setAdjLoading] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    Promise.all([
      getPlayer(id).then((r) => setPlayer(r.data.player)),
    ]).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleStatus = async (status: string) => {
    if (!id || !confirm(`Set status to ${status}?`)) return
    await setPlayerStatus(id, status)
    addToast(`Status set to ${status}`, 'success')
    load()
  }

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(adjForm.amount)
    if (!amount || !id) return
    if (!confirm(`${adjForm.type === 'credit' ? 'Credit' : 'Debit'} $${amount}?`)) return
    setAdjLoading(true)
    try {
      await adjustBalance(id, amount, adjForm.type, adjForm.reason)
      addToast('Balance adjusted', 'success')
      setAdjForm({ amount: '', type: 'credit', reason: '' })
      load()
    } catch { addToast('Failed', 'error') }
    finally { setAdjLoading(false) }
  }

  const handleNote = async () => {
    if (!id || !note.trim()) return
    await addNote(id, note)
    addToast('Note saved', 'success')
    load()
  }

  if (loading) return <div style={{ color: '#444' }}>Loading...</div>
  if (!player) return <div style={{ color: '#444' }}>Player not found</div>

  return (
    <div>
      <button onClick={() => nav('/admin/players')} style={{ color: '#444', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>← Back</button>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{player.username}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20, marginBottom: 20 }}>
        {/* Info card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, color: '#444', marginBottom: 12, letterSpacing: 0.5 }}>PLAYER INFO</div>
            {[['Email', player.email], ['Role', player.role], ['Registered', new Date(player.created_at).toLocaleDateString()]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                <span style={{ color: '#555' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
              <span style={{ color: '#555' }}>Status</span>
              <span style={{ color: statusColor[player.status] || '#555', fontWeight: 700 }}>{player.status}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#555' }}>Balance</span>
              <span style={{ fontWeight: 800, color: '#e4a832' }}>${Number(player.balance).toFixed(2)}</span>
            </div>
          </div>

          {/* Status buttons */}
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#444', marginBottom: 12, letterSpacing: 0.5 }}>ACCOUNT STATUS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[['active', 'Activate', '#22c55e'], ['suspended', 'Suspend', '#f59e0b'], ['banned', 'Ban', '#ef4444']].map(([s, label, c]) => (
                <button key={s} onClick={() => handleStatus(s as string)} disabled={player.status === s}
                  style={{ padding: '8px', borderRadius: 7, border: `1px solid ${c}40`, background: player.status === s ? c + '20' : 'transparent', color: c as string, fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: player.status === s ? 0.5 : 1 }}>
                  {label as string}
                </button>
              ))}
            </div>
          </div>

          {/* Balance adjustment */}
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#444', marginBottom: 12, letterSpacing: 0.5 }}>BALANCE ADJUSTMENT</div>
            <form onSubmit={handleAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={adjForm.amount} onChange={(e) => setAdjForm((f) => ({ ...f, amount: e.target.value }))}
                type="number" placeholder="Amount"
                style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
              <select value={adjForm.type} onChange={(e) => setAdjForm((f) => ({ ...f, type: e.target.value }))}
                style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12 }}>
                <option value="credit">Credit</option>
                <option value="debit">Debit</option>
              </select>
              <input value={adjForm.reason} onChange={(e) => setAdjForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="Reason"
                style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none' }} />
              <button type="submit" disabled={adjLoading}
                style={{ background: '#e4a832', color: '#000', fontWeight: 700, fontSize: 12, padding: '8px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
                Apply
              </button>
            </form>
          </div>

          {/* Note */}
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, color: '#444', marginBottom: 12, letterSpacing: 0.5 }}>NOTES</div>
            {player.notes && <div style={{ fontSize: 12, color: '#888', marginBottom: 8, background: '#111', padding: '8px 10px', borderRadius: 6 }}>{player.notes}</div>}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add note..."
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 12, outline: 'none', resize: 'vertical', minHeight: 60, boxSizing: 'border-box' }} />
            <button onClick={handleNote} style={{ marginTop: 8, background: '#1e1e1e', color: '#888', fontWeight: 600, fontSize: 12, padding: '7px 14px', borderRadius: 6, border: '1px solid #2a2a2a', cursor: 'pointer', width: '100%' }}>
              Save Note
            </button>
          </div>
        </div>

        {/* ID display */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, color: '#444', marginBottom: 12, letterSpacing: 0.5 }}>PLAYER ID</div>
          <code style={{ fontSize: 13, color: '#e4a832', background: '#111', padding: '8px 12px', borderRadius: 6, display: 'block' }}>{player.id}</code>
          <div style={{ fontSize: 11, color: '#444', marginTop: 20 }}>Transactions for this player are available in the Transactions tab filtered by user ID.</div>
        </div>
      </div>
    </div>
  )
}
