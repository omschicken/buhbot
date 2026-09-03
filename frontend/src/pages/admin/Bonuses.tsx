import { useEffect, useState } from 'react'
import { getAdminBonuses, createBonus, updateBonus, deleteBonus } from '../../api/admin'
import { useUIStore } from '../../store/useUIStore'

interface Bonus { id: string; name: string; type: string; amount: number; percent: number; wagering: number; min_deposit: number; currency: string; expires_days: number; active: boolean; created_at: string }

const emptyForm = { name: '', type: 'welcome', amount: '', percent: '', wagering: '30', min_deposit: '0', currency: 'USD', expires_days: '7', active: true }

export default function AdminBonuses() {
  const [bonuses, setBonuses] = useState<Bonus[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<null | 'create' | Bonus>(null)
  const [form, setForm] = useState(emptyForm)
  const { addToast } = useUIStore()

  const load = () => {
    setLoading(true)
    getAdminBonuses().then((r) => setBonuses(r.data.bonuses || [])).catch(() => addToast('Failed', 'error')).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(emptyForm); setModal('create') }
  const openEdit = (b: Bonus) => { setForm({ ...b, amount: String(b.amount || ''), percent: String(b.percent || ''), wagering: String(b.wagering), min_deposit: String(b.min_deposit), expires_days: String(b.expires_days) }); setModal(b) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form, amount: Number(form.amount) || null, percent: Number(form.percent) || null, wagering: Number(form.wagering), min_deposit: Number(form.min_deposit), expires_days: Number(form.expires_days) }
    try {
      if (modal === 'create') { await createBonus(data); addToast('Bonus created', 'success') }
      else { await updateBonus((modal as Bonus).id, data); addToast('Bonus updated', 'success') }
      setModal(null); load()
    } catch { addToast('Failed', 'error') }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bonus?')) return
    await deleteBonus(id)
    addToast('Deleted', 'success')
    load()
  }

  const handleToggle = async (b: Bonus) => {
    await updateBonus(b.id, { ...b, active: !b.active })
    addToast(b.active ? 'Deactivated' : 'Activated', 'success')
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Bonuses</h1>
        <button onClick={openCreate} style={{ background: '#e4a832', color: '#000', fontWeight: 700, fontSize: 13, padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>+ New Bonus</button>
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {['Name', 'Type', 'Amount', 'Wagering', 'Status', 'Actions'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#444', fontSize: 11, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#444' }}>Loading...</td></tr>
              : bonuses.length === 0 ? <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#444' }}>No bonuses</td></tr>
              : bonuses.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'transparent' : '#0d0d0d' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{b.name}</td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>{b.type}</td>
                  <td style={{ padding: '12px 16px' }}>{b.amount ? `$${b.amount}` : `${b.percent}%`} {b.currency}</td>
                  <td style={{ padding: '12px 16px', color: '#888' }}>×{b.wagering}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: 11, color: b.active ? '#22c55e' : '#555', background: b.active ? '#22c55e15' : '#55555515', padding: '3px 8px', borderRadius: 20 }}>{b.active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(b)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: '#e4a83220', color: '#e4a832', border: '1px solid #e4a83240', cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => handleToggle(b)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: b.active ? '#55555520' : '#22c55e20', color: b.active ? '#555' : '#22c55e', border: `1px solid ${b.active ? '#555' : '#22c55e'}40`, cursor: 'pointer' }}>{b.active ? 'Disable' : 'Enable'}</button>
                      <button onClick={() => handleDelete(b.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', cursor: 'pointer' }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 14, padding: 24, width: 420 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20 }}>{modal === 'create' ? 'New Bonus' : 'Edit Bonus'}</div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['Name', 'name', 'text'], ['Amount ($)', 'amount', 'number'], ['Percent (%)', 'percent', 'number'], ['Wagering (×)', 'wagering', 'number'], ['Min Deposit', 'min_deposit', 'number'], ['Expires (days)', 'expires_days', 'number']].map(([label, key, type]) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input value={form[key as keyof typeof form] as string} type={type} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 4 }}>Type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px', color: '#fff', fontSize: 13 }}>
                  {['welcome', 'deposit', 'free-spin', 'cashback', 'reload'].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, background: '#111', color: '#888', border: '1px solid #2a2a2a', borderRadius: 7, padding: 10, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, background: '#e4a832', color: '#000', fontWeight: 700, border: 'none', borderRadius: 7, padding: 10, cursor: 'pointer' }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
