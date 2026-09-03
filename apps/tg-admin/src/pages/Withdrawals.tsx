import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getWithdrawals } from '../api'

interface Withdrawal {
  id: string
  user_id: string
  username?: string
  email?: string
  amount: number
  coin?: string
  method?: string
  address?: string
  destination?: string
  status: string
  created_at: string
}

export default function Withdrawals() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: () => getWithdrawals().then((r) => r.data?.withdrawals || r.data || []),
  })
  const [_acting] = useState<string | null>(null)

  const items = (data as Withdrawal[]) || []

  return (
    <div className="page fade-in">
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>💸 Выводы</h1>

      {isLoading ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>Загрузка...</div>
      ) : isError ? (
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 13, color: 'var(--red)' }}>Ошибка загрузки</div>
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>Нет ожидающих выводов</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((w) => (
            <div key={w.id} className="card" onClick={() => navigate(`/withdrawals/${w.id}`)}
              style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{w.username || w.email || w.user_id.slice(0, 8)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                    {w.created_at ? new Date(w.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>${Number(w.amount).toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)' }}>{w.coin || w.method || '—'}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text2)', wordBreak: 'break-all' }}>
                {(() => { const addr = w.address || w.destination || ''; return addr ? `📍 ${addr.slice(0, 12)}...${addr.slice(-8)}` : '📍 —' })()}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6, textAlign: 'right' }}>Нажми для деталей →</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
