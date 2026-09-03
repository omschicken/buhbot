import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getAdminStats } from '../api'

export default function Dashboard() {
  const [key, setKey] = useState(0)
  const navigate = useNavigate()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stats', key],
    queryFn: () => getAdminStats().then((r) => r.data),
  })

  const refresh = useCallback(() => setKey((k) => k + 1), [])

  const cards = data ? [
    { label: 'Игроки', value: data.totalPlayers ?? 0, color: 'var(--gold)' },
    { label: 'Депозиты', value: `$${(data.ggrToday ?? 0).toFixed(0)}`, color: 'var(--green)' },
    { label: 'Pending', value: data.pendingWithdrawals?.count ?? 0, color: 'var(--red)' },
    { label: 'GGR', value: `$${(data.ggrMonth ?? 0).toFixed(0)}`, color: '#a855f7' },
  ] : []

  const events = [
    ...(data?.recentTransactions || []).slice(0, 5).map((tx: any) => ({
      icon: tx.type === 'deposit' ? '💚' : tx.type === 'withdrawal' ? '💸' : '🎰',
      text: `${tx.type} $${Number(tx.amount).toFixed(2)}`,
      sub: tx.username || tx.user_id?.slice(0, 8),
      time: tx.created_at,
      link: tx.type === 'withdrawal' && tx.reference_id
        ? `/withdrawals/${tx.reference_id}`
        : tx.user_id ? `/players/${tx.user_id}` : null,
    })),
    ...(data?.recentRegistrations || []).slice(0, 3).map((u: any) => ({
      icon: '👤',
      text: `Новый: ${u.username}`,
      sub: u.email,
      time: u.created_at,
      link: u.id ? `/players/${u.id}` : null,
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 8)

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>📊 Дашборд</h1>
        <button className="btn btn-outline" onClick={refresh} style={{ fontSize: 12 }}>🔄 Обновить</button>
      </div>

      {isLoading ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, padding: 20, textAlign: 'center' }}>Загрузка...</div>
      ) : isError ? (
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 13, color: 'var(--red)' }}>Ошибка загрузки</div>
          <button className="btn btn-outline" onClick={refresh} style={{ fontSize: 12, marginTop: 12 }}>🔄 Повторить</button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {cards.map((c) => (
              <div key={c.label} className="stat-card">
                <div className="value" style={{ color: c.color }}>{c.value}</div>
                <div className="label">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ fontSize: 13, fontWeight: 700, padding: '14px 16px 10px' }}>Последние события</div>
            {events.length === 0 && (
              <div style={{ color: 'var(--text3)', fontSize: 12, padding: '0 16px 16px' }}>Нет данных</div>
            )}
            {events.map((e, i) => (
              <div
                key={i}
                className="list-item"
                style={{ padding: '12px 16px', cursor: e.link ? 'pointer' : 'default', borderTop: '1px solid var(--border)' }}
                onClick={() => e.link && navigate(e.link)}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{e.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{e.text}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>{e.sub}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                    {e.time ? new Date(e.time).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                  {e.link && <span style={{ fontSize: 10, color: 'var(--text3)' }}>→</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
