import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import WebApp from '@twa-dev/sdk'
import { getWithdrawals, approveWithdrawal, rejectWithdrawal } from '../api'
import QRCode from 'qrcode'

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
  reason?: string
}

export default function WithdrawalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [txHash, setTxHash] = useState('')
  const [acting, setActing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const { data: list, isLoading } = useQuery({
    queryKey: ['withdrawals'],
    queryFn: () => getWithdrawals().then((r) => r.data?.withdrawals || r.data || []),
  })

  const w: Withdrawal | undefined = (list as Withdrawal[])?.find((x) => x.id === id)
  const addr = w?.address || w?.destination || ''
  const coin = w?.coin || w?.method || '—'

  useEffect(() => {
    if (addr && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, addr, { width: 180, margin: 1, color: { dark: '#000', light: '#fff' } }).catch(console.error)
    }
  }, [addr])

  const handleApprove = async () => {
    setActing(true)
    try {
      await approveWithdrawal(id!, txHash || undefined)
      WebApp.showAlert('✅ Вывод одобрен')
      qc.invalidateQueries({ queryKey: ['withdrawals'] })
      navigate(-1)
    } catch {
      WebApp.showAlert('❌ Ошибка при одобрении')
    } finally {
      setActing(false)
    }
  }

  const handleReject = () => {
    WebApp.showConfirm('Отклонить вывод? Средства вернутся игроку.', async (ok) => {
      if (!ok) return
      setActing(true)
      try {
        await rejectWithdrawal(id!, 'Отклонено администратором')
        WebApp.showAlert('✅ Вывод отклонён, средства возвращены')
        qc.invalidateQueries({ queryKey: ['withdrawals'] })
        navigate(-1)
      } catch {
        WebApp.showAlert('❌ Ошибка при отклонении')
      } finally {
        setActing(false)
      }
    })
  }

  if (isLoading) return <div className="page" style={{ color: 'var(--text3)', textAlign: 'center', paddingTop: 40 }}>Загрузка...</div>
  if (!w) return <div className="page" style={{ color: 'var(--text3)', textAlign: 'center', paddingTop: 40 }}>Не найден</div>

  const statusColor: Record<string, string> = { pending: '#f59e0b', approved: 'var(--green)', rejected: 'var(--red)' }

  return (
    <div className="page fade-in" style={{ opacity: acting ? 0.6 : 1 }}>
      <button onClick={() => navigate(-1)} style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 16 }}>← Назад</button>

      <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--red)', marginBottom: 4 }}>${Number(w.amount).toFixed(2)}</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>{coin} вывод</div>
        <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: 'var(--card2)', color: statusColor[w.status] || 'var(--text2)' }}>
          {w.status.toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        {[
          ['Игрок', w.username || w.email || w.user_id.slice(0, 16)],
          ['User ID', w.user_id.slice(0, 16) + '...'],
          ['Монета', coin],
          ['Дата', w.created_at ? new Date(w.created_at).toLocaleString('ru') : '—'],
          ...(w.reason ? [['Причина', w.reason]] : []),
        ].map(([label, value]) => (
          <div key={label} className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px' }}>
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
          </div>
        ))}
      </div>

      {addr && (
        <div className="card" style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>Адрес кошелька</div>
          <canvas ref={canvasRef} style={{ borderRadius: 8, display: 'block', margin: '0 auto 10px' }} />
          <div style={{ fontSize: 10, color: 'var(--text2)', wordBreak: 'break-all', padding: '0 4px' }}>{addr}</div>
          <button
            onClick={() => { navigator.clipboard?.writeText(addr); WebApp.showAlert('✅ Скопировано!') }}
            className="btn btn-outline"
            style={{ fontSize: 11, marginTop: 8, padding: '6px 16px' }}
          >
            📋 Копировать адрес
          </button>
        </div>
      )}

      {w.status === 'pending' && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>TX Hash (опционально)</div>
            <input
              className="search-input"
              placeholder="0x... или txid транзакции"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              style={{ fontSize: 12, marginBottom: 0 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-green" style={{ flex: 1 }} onClick={handleApprove} disabled={acting}>
              ✅ Одобрить
            </button>
            <button className="btn btn-red" style={{ flex: 1 }} onClick={handleReject} disabled={acting}>
              ❌ Отклонить
            </button>
          </div>
        </>
      )}
    </div>
  )
}
