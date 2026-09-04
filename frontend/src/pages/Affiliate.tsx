import { useEffect, useState } from 'react'
import { useUIStore } from '../store/useUIStore'
import { getAffiliateDashboard, savePayoutSettings } from '../api/affiliate'

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  approved: '#0ea5e9',
  completed: '#22c55e',
  rejected: '#ef4444',
}

export default function Affiliate() {
  const { addToast } = useUIStore()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState({ coin: 'USDT', address: '', minPayout: 50 })
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    getAffiliateDashboard()
      .then((r) => {
        const d = r.data?.dashboard || r.data
        setData(d)
        if (d?.payoutCoin || d?.payoutAddress) {
          setSettings({ coin: d.payoutCoin || 'USDT', address: d.payoutAddress || '', minPayout: d.minPayout || 50 })
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const copy = () => {
    if (data?.link) { navigator.clipboard.writeText(data.link); addToast('Ссылка скопирована!', 'success') }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings.address.trim()) { addToast('Укажи адрес для выплат', 'error'); return }
    setSaving(true)
    try {
      await savePayoutSettings(settings.coin, settings.address, settings.minPayout)
      addToast('Настройки сохранены', 'success')
      load()
    } catch { addToast('Ошибка сохранения', 'error') }
    finally { setSaving(false) }
  }

  const cm = data?.currentMonth || {}
  const payouts: any[] = data?.payouts || []
  const history: any[] = data?.history || []

  if (loading) return <div style={{ color: '#444', fontSize: 13, padding: 20 }}>Загрузка...</div>

  return (
    <div style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 3, height: 24, background: '#e4a832', borderRadius: 2 }} />
        <span style={{ fontSize: 14, fontWeight: 700 }}>Партнёрская программа</span>
      </div>

      {/* 1. Реф ссылка */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 11, color: '#444', letterSpacing: 0.5, marginBottom: 10 }}>РЕФЕРАЛЬНАЯ ССЫЛКА</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input readOnly value={data?.link || ''} style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#e4a832', outline: 'none' }} />
          <button onClick={copy} style={{ background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 12, padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', flexShrink: 0 }}>
            Копировать
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 8 }}>Реф код: <span style={{ color: '#888' }}>{data?.code}</span> · Комиссия: <span style={{ color: '#e4a832', fontWeight: 700 }}>{data?.commissionRate || data?.commission}%</span></div>
      </div>

      {/* 2. Статистика за текущий месяц */}
      <div>
        <div style={{ fontSize: 11, color: '#444', letterSpacing: 0.5, marginBottom: 10 }}>СТАТИСТИКА ЗА ТЕКУЩИЙ МЕСЯЦ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            ['Переходы', cm.clicks ?? 0, '#888'],
            ['Регистрации', cm.registrations ?? data?.referrals ?? 0, '#0ea5e9'],
            ['Активных', cm.activePlayers ?? 0, '#22c55e'],
            ['Заработано', `$${Number(cm.earned || 0).toFixed(2)}`, '#e4a832'],
          ].map(([label, value, color]) => (
            <div key={label as string} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: color as string }}>{value as string}</div>
              <div style={{ fontSize: 10, color: '#444', marginTop: 4 }}>{label as string}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Настройки выплат */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 11, color: '#444', letterSpacing: 0.5, marginBottom: 14 }}>НАСТРОЙКИ ВЫПЛАТ</div>
        <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>МОНЕТА</div>
            <select value={settings.coin} onChange={(e) => setSettings((s) => ({ ...s, coin: e.target.value }))}
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#fff', fontSize: 12 }}>
              <option value="USDT">USDT</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="SOL">SOL</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>АДРЕС ДЛЯ ВЫПЛАТ</div>
            <input value={settings.address} onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))}
              placeholder="0x... или TRC20 адрес"
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>МИН. ВЫПЛАТА ($)</div>
            <input type="number" min={50} value={settings.minPayout} onChange={(e) => setSettings((s) => ({ ...s, minPayout: Number(e.target.value) }))}
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '9px 10px', color: '#fff', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={saving}
            style={{ background: '#e4a832', color: '#000', fontWeight: 700, fontSize: 12, padding: '9px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Сохранить
          </button>
        </form>
        <div style={{ fontSize: 11, color: '#444', marginTop: 10 }}>Выплаты автоматически 1-го числа каждого месяца при достижении минимальной суммы.</div>
      </div>

      {/* 4. История выплат */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 11, color: '#444', letterSpacing: 0.5, marginBottom: 14 }}>ИСТОРИЯ ВЫПЛАТ</div>
        {payouts.length === 0 ? (
          <div style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: '20px 0' }}>Выплат пока нет</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Период', 'Сумма', 'Монета', 'Статус', 'TX Hash'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', color: '#444', fontWeight: 600, padding: '0 0 10px', fontSize: 10, letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} style={{ borderTop: '1px solid #1e1e1e' }}>
                  <td style={{ padding: '10px 0', color: '#888' }}>{p.period}</td>
                  <td style={{ padding: '10px 0', fontWeight: 700, color: '#e4a832' }}>${Number(p.amount).toFixed(2)}</td>
                  <td style={{ padding: '10px 0', color: '#888' }}>{p.coin}</td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{ color: STATUS_COLOR[p.status] || '#888', fontWeight: 700, fontSize: 11 }}>
                      {p.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    {p.tx_hash ? (
                      <span style={{ color: '#0ea5e9', fontSize: 10, fontFamily: 'monospace' }}>
                        {p.tx_hash.slice(0, 16)}...
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 5. История по месяцам */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 11, color: '#444', letterSpacing: 0.5, marginBottom: 14 }}>ИСТОРИЯ ПО МЕСЯЦАМ</div>
        {history.length === 0 ? (
          <div style={{ fontSize: 12, color: '#333', textAlign: 'center', padding: '20px 0' }}>Нет данных</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Месяц', 'Рефералов', 'NGR', 'Комиссия', 'Статус выплаты'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', color: '#444', fontWeight: 600, padding: '0 0 10px', fontSize: 10, letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.period} style={{ borderTop: '1px solid #1e1e1e' }}>
                  <td style={{ padding: '10px 0', color: '#888' }}>{h.period}</td>
                  <td style={{ padding: '10px 0' }}>{h.referrals}</td>
                  <td style={{ padding: '10px 0', color: '#888' }}>${Number(h.ngr || 0).toFixed(2)}</td>
                  <td style={{ padding: '10px 0', fontWeight: 700, color: '#22c55e' }}>${Number(h.commission || 0).toFixed(2)}</td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{ color: STATUS_COLOR[h.payout_status] || '#444', fontSize: 11 }}>
                      {h.payout_status || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 6. Как это работает */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 11, color: '#444', letterSpacing: 0.5, marginBottom: 16 }}>КАК ЭТО РАБОТАЕТ</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            ['1', 'Поделись реф ссылкой'],
            ['2', 'Игрок регистрируется по твоей ссылке'],
            ['3', '1-го числа каждого месяца считается NGR'],
            ['4', `Получаешь ${data?.commissionRate || data?.commission || 35}% от NGR`],
            ['5', 'Автоматическая выплата на твой адрес'],
          ].map(([n, text]) => (
            <div key={n} style={{ textAlign: 'center' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#e4a83215', border: '1px solid #e4a83240', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#e4a832' }}>{n}</div>
              <div style={{ fontSize: 11, color: '#666', lineHeight: 1.4 }}>{text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
