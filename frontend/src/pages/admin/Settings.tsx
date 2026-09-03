import { useState } from 'react'
import { useUIStore } from '../../store/useUIStore'
import { seedAdmin } from '../../api/admin'

export default function AdminSettings() {
  const { addToast } = useUIStore()
  const [maintenance, setMaintenance] = useState(false)
  const [limits, setLimits] = useState({ minBet: '1', maxBet: '10000', maxWithdrawal: '50000' })
  const [countries, setCountries] = useState('US\nUK\nAU')

  const handleSeed = async () => {
    if (!confirm('Create admin account admin@casino.com / Admin123!?')) return
    try {
      const r = await seedAdmin()
      addToast(r.data.message, 'success')
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Failed', 'error')
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Settings</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Betting limits */}
        <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Betting Limits</div>
          {[['Min Bet ($)', 'minBet'], ['Max Bet ($)', 'maxBet'], ['Max Withdrawal ($)', 'maxWithdrawal']].map(([label, key]) => (
            <div key={key} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>{label}</label>
              <input value={limits[key as keyof typeof limits]} onChange={(e) => setLimits((l) => ({ ...l, [key]: e.target.value }))}
                type="number"
                style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <button onClick={() => addToast('Limits saved', 'success')}
            style={{ background: '#e4a832', color: '#000', fontWeight: 700, fontSize: 13, padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Save Limits</button>
        </div>

        {/* Maintenance + Geo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Maintenance Mode</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: maintenance ? '#ef4444' : '#888' }}>{maintenance ? 'SITE IS DOWN FOR MAINTENANCE' : 'Site is live'}</span>
              <button onClick={() => { setMaintenance(!maintenance); addToast(maintenance ? 'Site is live' : 'Maintenance ON', maintenance ? 'success' : 'error') }}
                style={{ padding: '8px 20px', borderRadius: 7, background: maintenance ? '#22c55e20' : '#ef444420', color: maintenance ? '#22c55e' : '#ef4444', border: `1px solid ${maintenance ? '#22c55e' : '#ef4444'}40`, fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                {maintenance ? 'Turn Off' : 'Enable'}
              </button>
            </div>
          </div>

          <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Blocked Countries</div>
            <div style={{ fontSize: 11, color: '#444', marginBottom: 8 }}>One country code per line</div>
            <textarea value={countries} onChange={(e) => setCountries(e.target.value)}
              style={{ width: '100%', background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 100, boxSizing: 'border-box' }} />
            <button onClick={() => addToast('Geoblocking saved', 'success')}
              style={{ marginTop: 10, background: '#e4a832', color: '#000', fontWeight: 700, fontSize: 13, padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>Save</button>
          </div>

          <div style={{ background: '#1a1a1a', border: '1px solid #ef444440', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: '#ef4444' }}>Admin Seed</div>
            <div style={{ fontSize: 12, color: '#444', marginBottom: 12 }}>Creates admin@casino.com / Admin123! if no admin exists</div>
            <button onClick={handleSeed}
              style={{ background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440', fontWeight: 700, fontSize: 12, padding: '9px 20px', borderRadius: 8, cursor: 'pointer' }}>Seed Admin</button>
          </div>
        </div>
      </div>
    </div>
  )
}
