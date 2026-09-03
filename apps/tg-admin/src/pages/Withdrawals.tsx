import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { getWithdrawals, approveWithdrawal, rejectWithdrawal } from '../api'

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
  const qc = useQueryClient()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: () => getWithdrawals().then((r) => r.data?.withdrawals || r.data || []),
  })
  const [acting, setActing] = useState<string | null>(null)
  const [txInput, setTxInput] = useState<Record<string, string>>({})
  const [showApprove, setShowApprove] = useState<string | null>(null)

  const handleApprove = async (id: string) => {
    setActing(id)
    try {
      await approveWithdrawal(id, txInput[id])
      WebApp.showAlert('✅ Вывод одобрен')
      qc.invalidateQueries({ queryKey: ['withdrawals'] })
    } catch {
      WebApp.showAlert('❌ Ошибка')
    } finally {
      setActing(null)
      setShowApprove(null)
    }
  }

  const handleReject = (id: string) => {
    WebApp.showConfirm('Отклонить вывод?', async (ok) => {
      if (!ok) return
      setActing(id)
      try {
        await rejectWithdrawal(id, 'Отклонено администратором')
        WebApp.showAlert('✅ Вывод отклонён, средства возвращены')
        qc.invalidateQueries({ queryKey: ['withdrawals'] })
      } catch {
        WebApp.showAlert('❌ Ошибка')
      } finally {
        setActing(null)
      }
    })
  }

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
            <div key={w.id} className="card" style={{ opacity: acting === w.id ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{w.username || w.email || w.user_id.slice(0, 8)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                    {new Date(w.created_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--red)' }}>${Number(w.amount).toFixed(2)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text2)' }}>{w.coin || w.method || '—'}</div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, wordBreak: 'break-all' }}>
                {(() => { const addr = w.address || w.destination || ''; return addr ? `📍 ${addr.slice(0, 12)}...${addr.slice(-8)}` : '📍 —' })()}
              </div>

              {showApprove === w.id && (
                <div style={{ marginBottom: 10 }}>
                  <input className="search-input" placeholder="TX hash (опционально)" style={{ fontSize: 12 }}
                    value={txInput[w.id] || ''} onChange={(e) => setTxInput((p) => ({ ...p, [w.id]: e.target.value }))} />
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                {showApprove === w.id ? (
                  <>
                    <button className="btn btn-green" style={{ flex: 1 }} onClick={() => handleApprove(w.id)} disabled={acting === w.id}>
                      Подтвердить
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowApprove(null)}>Отмена</button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-green" style={{ flex: 1 }} onClick={() => setShowApprove(w.id)}>✅ Approve</button>
                    <button className="btn btn-red" style={{ flex: 1 }} onClick={() => handleReject(w.id)}>❌ Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
