import { useEffect, useState } from 'react'
import { useUIStore } from '../../store/useUIStore'
import { getAffiliates, getAffiliatePayouts, approveAffiliatePayout, rejectAffiliatePayout } from '../../api/admin'

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#0ea5e9',
  completed: '#22c55e',
  rejected: '#ef4444',
}

type Tab = 'list' | 'payouts'

export default function AdminAffiliates() {
  const { addToast } = useUIStore()
  const [tab, setTab] = useState<Tab>('payouts')
  const [affiliates, setAffiliates] = useState<any[]>([])
  const [payouts, setPayouts] = useState<any[]>([])
  const [payoutStatus, setPayoutStatus] = useState('pending')
  const [loading, setLoading] = useState(false)
  const [approveModal, setApproveModal] = useState<{ id: string; username: string; amount: number; coin: string } | null>(null)
  const [txHash, setTxHash] = useState('')
  const [rejectModal, setRejectModal] = useState<{ id: string; username: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const loadAffiliates = async () => {
    setLoading(true)
    try {
      const r = await getAffiliates()
      setAffiliates(r.data?.data || [])
    } catch { addToast('Ошибка загрузки', 'error') }
    finally { setLoading(false) }
  }

  const loadPayouts = async () => {
    setLoading(true)
    try {
      const r = await getAffiliatePayouts(payoutStatus)
      setPayouts(r.data?.data || [])
    } catch { addToast('Ошибка загрузки', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => { if (tab === 'list') loadAffiliates(); else loadPayouts() }, [tab, payoutStatus])

  const handleApprove = async () => {
    if (!approveModal || !txHash.trim()) { addToast('Укажи TX Hash', 'error'); return }
    try {
      await approveAffiliatePayout(approveModal.id, txHash)
      addToast('Выплата подтверждена', 'success')
      setApproveModal(null); setTxHash('')
      loadPayouts()
    } catch { addToast('Ошибка', 'error') }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    try {
      await rejectAffiliatePayout(rejectModal.id, rejectReason)
      addToast('Выплата отклонена', 'success')
      setRejectModal(null); setRejectReason('')
      loadPayouts()
    } catch { addToast('Ошибка', 'error') }
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'payouts', label: '💸 Выплаты' },
    { key: 'list', label: '👥 Аффилиаты' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Партнёрская программа</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
              background: tab === t.key ? '#e4a832' : '#1a1a1a', color: tab === t.key ? '#000' : '#888' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'payouts' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['pending', 'approved', 'completed', 'rejected', 'all'].map((s) => (
              <button key={s} onClick={() => setPayoutStatus(s)}
                style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                  background: payoutStatus === s ? '#e4a83220' : 'transparent',
                  color: payoutStatus === s ? '#e4a832' : '#555', borderWidth: 1, borderStyle: 'solid',
                  borderColor: payoutStatus === s ? '#e4a83240' : '#222' }}>
                {s}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ color: '#444', fontSize: 13 }}>Загрузка...</div>
          ) : payouts.length === 0 ? (
            <div style={{ color: '#333', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Нет выплат</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {payouts.map((p) => (
                <div key={p.id} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{p.username}</span>
                        <span style={{ fontSize: 10, color: '#555' }}>{p.email}</span>
                        <span style={{ fontSize: 10, background: '#2a2a2a', padding: '2px 8px', borderRadius: 4, color: '#888' }}>
                          {p.ref_code}
                        </span>
                        <span style={{ color: STATUS_COLOR[p.status] || '#888', fontWeight: 700, fontSize: 11 }}>
                          {p.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 20, fontSize: 12, color: '#666' }}>
                        <span>Период: <b style={{ color: '#888' }}>{p.period}</b></span>
                        <span>Сумма: <b style={{ color: '#e4a832', fontSize: 15 }}>${Number(p.amount).toFixed(2)}</b></span>
                        <span>Монета: <b style={{ color: '#888' }}>{p.coin}</b></span>
                        <span>Комиссия: <b style={{ color: '#888' }}>{p.commission_rate}%</b></span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 11, color: '#555', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        📍 {p.address}
                      </div>
                      {p.tx_hash && (
                        <div style={{ marginTop: 4, fontSize: 11, color: '#0ea5e9', fontFamily: 'monospace' }}>
                          🔗 TX: {p.tx_hash}
                        </div>
                      )}
                      {p.rejected_reason && (
                        <div style={{ marginTop: 4, fontSize: 11, color: '#ef4444' }}>
                          Причина: {p.rejected_reason}
                        </div>
                      )}
                    </div>
                    {p.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button onClick={() => setApproveModal({ id: p.id, username: p.username, amount: parseFloat(p.amount), coin: p.coin })}
                          style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          ✅ Одобрить
                        </button>
                        <button onClick={() => setRejectModal({ id: p.id, username: p.username })}
                          style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', borderRadius: 7, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          ❌ Отклонить
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'list' && (
        loading ? (
          <div style={{ color: '#444', fontSize: 13 }}>Загрузка...</div>
        ) : (
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#111' }}>
                  {['Пользователь', 'Реф код', 'Рефералов', 'Активных', 'Комиссия %', 'Заработано', 'Адрес выплат'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', color: '#444', fontWeight: 600, padding: '12px 16px', fontSize: 10, letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a) => (
                  <tr key={a.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 700 }}>{a.username}</div>
                      <div style={{ fontSize: 10, color: '#555' }}>{a.email}</div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#e4a832', fontFamily: 'monospace', fontSize: 11 }}>{a.referral_code}</td>
                    <td style={{ padding: '12px 16px' }}>{a.total_referrals}</td>
                    <td style={{ padding: '12px 16px', color: '#22c55e' }}>{a.active_referrals}</td>
                    <td style={{ padding: '12px 16px' }}>{a.commission_rate}%</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#e4a832' }}>${Number(a.total_earned).toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontSize: 10, color: '#555', fontFamily: 'monospace', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {a.payout_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {affiliates.length === 0 && <div style={{ color: '#333', fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Нет аффилиатов</div>}
          </div>
        )
      )}

      {/* Approve modal */}
      {approveModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000a0', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 14, padding: 24, width: 420, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Подтвердить выплату</h3>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              {approveModal.username} — <span style={{ color: '#e4a832', fontWeight: 700 }}>${approveModal.amount.toFixed(2)} {approveModal.coin}</span>
            </p>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>TX HASH (обязательно)</div>
            <input value={txHash} onChange={(e) => setTxHash(e.target.value)}
              placeholder="Хэш транзакции после отправки"
              style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 7, padding: '10px 12px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleApprove}
                style={{ flex: 1, background: '#22c55e', color: '#000', fontWeight: 700, fontSize: 13, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                Подтвердить
              </button>
              <button onClick={() => { setApproveModal(null); setTxHash('') }}
                style={{ flex: 1, background: '#2a2a2a', color: '#888', fontSize: 13, padding: 10, borderRadius: 8, border: '1px solid #333', cursor: 'pointer' }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000a0', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 14, padding: 24, width: 380, maxWidth: '90vw' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Отклонить выплату</h3>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{rejectModal.username}</p>
            <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Причина (необязательно)"
              style={{ width: '100%', background: '#111', border: '1px solid #333', borderRadius: 7, padding: '10px 12px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleReject}
                style={{ flex: 1, background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 13, padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer' }}>
                Отклонить
              </button>
              <button onClick={() => { setRejectModal(null); setRejectReason('') }}
                style={{ flex: 1, background: '#2a2a2a', color: '#888', fontSize: 13, padding: 10, borderRadius: 8, border: '1px solid #333', cursor: 'pointer' }}>
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
