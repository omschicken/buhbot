import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import WebApp from '@twa-dev/sdk'
import { getKYCPending, reviewKYC } from '../api'

interface KYCItem {
  user_id: string
  username?: string
  email?: string
  level: number
  status: string
  documents?: string[]
  created_at: string
}

export default function KYC() {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['kyc'],
    queryFn: () => getKYCPending().then((r) => r.data?.items || r.data || []),
  })
  const [acting, setActing] = useState<string | null>(null)

  const handleApprove = (userId: string, level: number) => {
    WebApp.showConfirm(`Подтвердить KYC Level ${level}?`, async (ok) => {
      if (!ok) return
      setActing(userId)
      try {
        await reviewKYC(userId, 'approve', level)
        WebApp.showAlert('✅ KYC одобрен')
        qc.invalidateQueries({ queryKey: ['kyc'] })
      } catch {
        WebApp.showAlert('❌ Ошибка')
      } finally {
        setActing(null)
      }
    })
  }

  const handleReject = (userId: string) => {
    WebApp.showConfirm('Отклонить KYC?', async (ok) => {
      if (!ok) return
      setActing(userId)
      try {
        await reviewKYC(userId, 'reject')
        WebApp.showAlert('✅ KYC отклонён')
        qc.invalidateQueries({ queryKey: ['kyc'] })
      } catch {
        WebApp.showAlert('❌ Ошибка')
      } finally {
        setActing(null)
      }
    })
  }

  const items = (data as KYCItem[]) || []

  return (
    <div className="page fade-in">
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🔐 KYC</h1>

      {isLoading ? (
        <div style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: 20 }}>Загрузка...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 30 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>Нет заявок на проверку</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((k) => (
            <div key={k.user_id} className="card" style={{ opacity: acting === k.user_id ? 0.5 : 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{k.username || k.email || k.user_id.slice(0, 8)}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                    {k.created_at ? new Date(k.created_at).toLocaleDateString('ru') : '—'}
                  </div>
                </div>
                <div style={{ padding: '4px 10px', background: 'var(--gold-dim)', borderRadius: 6, fontSize: 11, color: 'var(--gold)', fontWeight: 700, alignSelf: 'flex-start' }}>
                  Level {k.level}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-green" style={{ flex: 1 }} onClick={() => handleApprove(k.user_id, k.level)}>
                  ✅ Approve
                </button>
                <button className="btn btn-red" style={{ flex: 1 }} onClick={() => handleReject(k.user_id)}>
                  ❌ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
