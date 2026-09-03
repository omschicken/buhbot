import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { getAdminStats } from '../../api/admin'
import { useUIStore } from '../../store/useUIStore'

interface Stats {
  totalPlayers?: number
  activeToday?: number
  ggrToday?: number
  ggrMonth?: number
  pendingWithdrawals?: { count: number; sum: number }
  recentRegistrations?: { id: string; email: string; username: string; created_at: string }[]
  recentTransactions?: { id: string; user_id: string; type: string; amount: number; status: string; created_at: string }[]
  ggrChart?: { day: string; ggr: number }[]
}

const txColor: Record<string, string> = { deposit: '#22c55e', withdrawal: '#ef4444', bet: '#555', win: '#e4a832', bonus: '#a855f7' }

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const { addToast } = useUIStore()

  useEffect(() => {
    getAdminStats()
      .then((r) => setStats(r.data))
      .catch(() => addToast('Failed to load stats', 'error'))
      .finally(() => setLoading(false))
  }, [])

  const cards = [
    ['Total Players', stats?.totalPlayers ?? '—', '#e4a832'],
    ['Active Today', stats?.activeToday ?? '—', '#22c55e'],
    ['GGR Today', `$${(stats?.ggrToday ?? 0).toFixed(2)}`, '#0ea5e9'],
    ['GGR Month', `$${(stats?.ggrMonth ?? 0).toFixed(2)}`, '#a855f7'],
    ['Pending Withdrawals', stats?.pendingWithdrawals?.count ?? '—', '#ef4444'],
    ['Pending Amount', `$${(stats?.pendingWithdrawals?.sum ?? 0).toFixed(2)}`, '#f59e0b'],
  ]

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Dashboard</h1>

      {loading ? <div style={{ color: '#444' }}>Loading...</div> : (
        <>
          {/* Stat cards */}
          <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
            {cards.map(([label, value, color]) => (
              <div key={label as string} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '16px 14px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: color as string }}>{value as string | number}</div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 4, letterSpacing: 0.5 }}>{label as string}</div>
              </div>
            ))}
          </div>

          {/* GGR Chart */}
          {stats?.ggrChart && stats.ggrChart.length > 0 && (
            <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>GGR — Last 30 Days</div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={stats.ggrChart}>
                  <XAxis dataKey="day" tick={{ fill: '#444', fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fill: '#444', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                  <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8 }} formatter={(v) => [`$${Number(v).toFixed(2)}`, 'GGR']} />
                  <Line type="monotone" dataKey="ggr" stroke="#e4a832" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="admin-lists-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Recent registrations */}
            <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #222', fontSize: 12, fontWeight: 700 }}>Recent Registrations</div>
              {(stats?.recentRegistrations || []).map((u) => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid #1e1e1e', fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{u.username}</div>
                    <div style={{ color: '#444', fontSize: 11 }}>{u.email}</div>
                  </div>
                  <div style={{ color: '#444', fontSize: 11 }}>{new Date(u.created_at).toLocaleDateString()}</div>
                </div>
              ))}
              {!stats?.recentRegistrations?.length && <div style={{ padding: 20, color: '#444', fontSize: 12 }}>No data</div>}
            </div>

            {/* Recent transactions */}
            <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #222', fontSize: 12, fontWeight: 700 }}>Recent Transactions</div>
              {(stats?.recentTransactions || []).map((tx) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 18px', borderBottom: '1px solid #1e1e1e', fontSize: 12 }}>
                  <div>
                    <span style={{ color: txColor[tx.type] || '#555', fontWeight: 600 }}>{tx.type}</span>
                    <span style={{ color: '#444', fontSize: 10, marginLeft: 8 }}>{tx.user_id.slice(0, 8)}</span>
                  </div>
                  <div style={{ fontWeight: 700 }}>${Number(tx.amount).toFixed(2)}</div>
                </div>
              ))}
              {!stats?.recentTransactions?.length && <div style={{ padding: 20, color: '#444', fontSize: 12 }}>No data</div>}
            </div>
          </div>
        </>
      )}
      <style>{`
        @media (max-width: 768px) {
          .admin-stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .admin-lists-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
