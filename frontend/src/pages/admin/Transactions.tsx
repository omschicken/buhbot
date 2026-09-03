import { useEffect, useState } from 'react'
import { getAdminTransactions } from '../../api/admin'
import { useUIStore } from '../../store/useUIStore'

interface Tx { id: string; user_id: string; type: string; amount: number; status: string; description: string; created_at: string; reference_id: string }

const typeColor: Record<string, string> = { deposit: '#22c55e', withdrawal: '#ef4444', bet: '#555', win: '#e4a832', bonus: '#a855f7' }

export default function AdminTransactions() {
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ type: '', from: '', to: '', search: '' })
  const { addToast } = useUIStore()

  const load = (f = filters) => {
    setLoading(true)
    getAdminTransactions(f as Record<string, string>)
      .then((r) => setTxs(r.data.transactions || []))
      .catch(() => addToast('Failed to load', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const exportCSV = () => {
    const headers = 'id,user_id,type,amount,status,description,created_at'
    const rows = txs.map((t) => `${t.id},${t.user_id},${t.type},${t.amount},${t.status},"${t.description || ''}",${t.created_at}`)
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'transactions.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Transactions</h1>
        <button onClick={exportCSV} style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', fontSize: 12, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Export CSV</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#888', fontSize: 12 }}>
          <option value="">All types</option>
          <option value="deposit">Deposit</option>
          <option value="withdrawal">Withdrawal</option>
          <option value="bet">Bet</option>
          <option value="win">Win</option>
          <option value="bonus">Bonus</option>
        </select>
        <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#888', fontSize: 12 }} />
        <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#888', fontSize: 12 }} />
        <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="User ID / Ref ID"
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none', flex: 1 }} />
        <button onClick={() => load()} style={{ background: '#e4a832', color: '#000', fontWeight: 700, fontSize: 12, padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Filter</button>
      </div>

      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222' }}>
              {['Type', 'Amount', 'User', 'Description', 'Status', 'Date'].map((h) => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#444', fontSize: 11, fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#444' }}>Loading...</td></tr>
              : txs.length === 0 ? <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#444' }}>No transactions</td></tr>
              : txs.map((tx, i) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid #1a1a1a', background: i % 2 === 0 ? 'transparent' : '#0d0d0d' }}>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 11, color: typeColor[tx.type] || '#555', background: (typeColor[tx.type] || '#555') + '15', padding: '2px 8px', borderRadius: 20 }}>{tx.type}</span>
                  </td>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: ['deposit', 'win', 'bonus'].includes(tx.type) ? '#22c55e' : '#ef4444' }}>
                    {['deposit', 'win', 'bonus'].includes(tx.type) ? '+' : '-'}${Math.abs(Number(tx.amount)).toFixed(2)}
                  </td>
                  <td style={{ padding: '10px 16px', color: '#555' }}>{tx.user_id.slice(0, 8)}...</td>
                  <td style={{ padding: '10px 16px', color: '#888', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ fontSize: 11, color: tx.status === 'completed' ? '#22c55e' : '#f59e0b' }}>{tx.status}</span>
                  </td>
                  <td style={{ padding: '10px 16px', color: '#444', fontSize: 11 }}>{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
