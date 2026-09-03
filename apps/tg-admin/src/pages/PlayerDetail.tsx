import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { getPlayer, setPlayerStatus } from '../api'

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['player', id],
    queryFn: () => getPlayer(id!).then((r) => r.data?.player || r.data),
    enabled: !!id,
  })

  const changeStatus = (status: string, label: string) => {
    WebApp.showConfirm(`${label} игрока?`, async (ok) => {
      if (!ok) return
      try {
        await setPlayerStatus(id!, status)
        WebApp.showAlert(`✅ Статус: ${status}`)
        qc.invalidateQueries({ queryKey: ['player', id] })
        qc.invalidateQueries({ queryKey: ['players'] })
      } catch {
        WebApp.showAlert('❌ Ошибка')
      }
    })
  }

  if (isLoading) return <div className="page" style={{ color: 'var(--text3)', textAlign: 'center', paddingTop: 40 }}>Загрузка...</div>
  if (!data) return <div className="page" style={{ color: 'var(--text3)', textAlign: 'center', paddingTop: 40 }}>Не найден</div>

  const p = data
  const statusColor: Record<string, string> = { active: 'var(--green)', suspended: '#f59e0b', banned: 'var(--red)' }

  return (
    <div className="page fade-in">
      <button onClick={() => navigate(-1)} style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 16 }}>← Назад</button>

      <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--gold-dim)', border: '2px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'var(--gold)', margin: '0 auto 10px' }}>
          {p.username?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={{ fontSize: 16, fontWeight: 700 }}>{p.username}</div>
        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.email}</div>
        <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: statusColor[p.status || 'active'] }}>
          {(p.status || 'active').toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[
          ['Баланс', `$${Number(p.balance || 0).toFixed(2)}`, 'var(--gold)'],
          ['ID', p.id?.slice(0, 16) + '...', 'var(--text2)'],
          ['Роль', p.role || 'user', 'var(--text)'],
          ['Регистрация', p.created_at ? new Date(p.created_at).toLocaleDateString('ru') : '—', 'var(--text2)'],
        ].map(([label, value, color]) => (
          <div key={label} className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {p.status !== 'active' && (
          <button className="btn btn-green" style={{ flex: 1 }} onClick={() => changeStatus('active', 'Активировать')}>
            ✅ Activate
          </button>
        )}
        {p.status !== 'suspended' && (
          <button className="btn btn-outline" style={{ flex: 1, borderColor: '#f59e0b', color: '#f59e0b' }}
            onClick={() => changeStatus('suspended', 'Заморозить')}>
            ⏸ Suspend
          </button>
        )}
        {p.status !== 'banned' && (
          <button className="btn btn-red" style={{ flex: 1 }} onClick={() => changeStatus('banned', 'Забанить')}>
            🚫 Ban
          </button>
        )}
      </div>
    </div>
  )
}
