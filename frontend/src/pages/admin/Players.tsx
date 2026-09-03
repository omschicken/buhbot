import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPlayers } from '../../api/admin'
import { useUIStore } from '../../store/useUIStore'

interface Player {
  id: string; email: string; username: string; balance: number
  status: string; role: string; created_at: string
}

const statusColor: Record<string, string> = { active: '#22c55e', suspended: '#f59e0b', banned: '#ef4444' }

export default function AdminPlayers() {
  const [players, setPlayers] = useState<Player[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const { addToast } = useUIStore()
  const nav = useNavigate()

  const load = (p = page, s = search, st = status) => {
    setLoading(true)
    getPlayers(p, s, st)
      .then((r) => { setPlayers(r.data.players || []); setTotal(r.data.total || 0) })
      .catch(() => addToast('Failed to load players', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [page])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    load(1, search, status)
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Players</h1>

      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search email or username..."
          style={{ flex: 1, background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '9px 12px', color: '#888', fontSize: 13 }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
        <button type="submit" style={{ background: '#e4a832', color: '#000', fontWeight: 700, fontSize: 13, padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Search</button>
      </form>

      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {['Username', 'Email', 'Balance', 'Status', 'Registered', ''].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#444', fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#444' }}>Loading...</td></tr>
            ) : players.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#444' }}>No players found</td></tr>
            ) : players.map((p, i) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'transparent' : '#0d0d0d', cursor: 'pointer' }}
                onClick={() => nav(`/admin/players/${p.id}`)}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{p.username}</td>
                <td style={{ padding: '12px 16px', color: '#888' }}>{p.email}</td>
                <td style={{ padding: '12px 16px', fontWeight: 700, color: '#e4a832' }}>${Number(p.balance).toFixed(2)}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ fontSize: 11, color: statusColor[p.status] || '#555', background: (statusColor[p.status] || '#555') + '15', padding: '3px 8px', borderRadius: 20 }}>{p.status}</span>
                </td>
                <td style={{ padding: '12px 16px', color: '#444', fontSize: 11 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={(e) => { e.stopPropagation(); nav(`/admin/players/${p.id}`) }}
                    style={{ fontSize: 11, color: '#e4a832', background: 'none', border: 'none', cursor: 'pointer' }}>View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, fontSize: 12, color: '#444' }}>
        <span>Total: {total}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 6, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
          <span style={{ padding: '6px 14px' }}>Page {page}</span>
          <button disabled={players.length < 20} onClick={() => setPage((p) => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 6, background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', cursor: 'pointer', opacity: players.length < 20 ? 0.4 : 1 }}>Next</button>
        </div>
      </div>
    </div>
  )
}
