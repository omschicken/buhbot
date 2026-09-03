import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getPlayers } from '../api'

interface Player {
  id: string
  username: string
  email: string
  balance?: number
  status?: string
  created_at: string
}

export default function Players() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['players', search],
    queryFn: () => getPlayers(search || undefined).then((r) => r.data?.players || r.data || []),
  })

  const players = (data as Player[]) || []

  const statusColor: Record<string, string> = { active: 'var(--green)', suspended: '#f59e0b', banned: 'var(--red)' }

  return (
    <div className="page fade-in">
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>👥 Игроки</h1>

      <input className="search-input" placeholder="🔍 Поиск по имени или email..." value={search}
        onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: 14 }} />

      {isLoading ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>Загрузка...</div>
      ) : players.length === 0 ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>Не найдено</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {players.map((p) => (
            <div key={p.id} className="list-item" onClick={() => navigate(`/players/${p.id}`)}
              style={{ cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{p.username}</div>
                <div style={{ fontSize: 10, color: 'var(--text3)' }}>{p.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold)' }}>
                  ${Number(p.balance || 0).toFixed(2)}
                </div>
                <div style={{ fontSize: 9, color: statusColor[p.status || 'active'] || 'var(--text3)', fontWeight: 700 }}>
                  {(p.status || 'active').toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
