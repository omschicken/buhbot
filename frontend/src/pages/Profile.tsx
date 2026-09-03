import { useAuthStore } from '../store/useAuthStore'
import { useUIStore } from '../store/useUIStore'

export default function Profile() {
  const { user, balance } = useAuthStore()
  const { addToast } = useUIStore()

  return (
    <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Profile</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
        {/* Profile card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--gold-dim)', border: '3px solid var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'var(--gold)', margin: '0 auto 12px' }}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{user?.username || 'Player'}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{user?.email || 'player@casino.com'}</div>
            <div style={{ marginTop: 12, padding: '6px 14px', background: 'var(--gold-dim)', borderRadius: 20, display: 'inline-block', fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>VIP Level 3</div>
          </div>

          {[
            ['Balance', `$${balance.toFixed(2)}`, 'var(--gold)'],
            ['Total Wins', '$8,420.00', 'var(--green)'],
            ['Games Played', '1,240', 'var(--text)'],
          ].map(([label, value, color]) => (
            <div key={label as string} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: color as string }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Settings */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Account Settings</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Username', 'Email', 'Phone'].map((label) => (
              <div key={label}>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>{label}</label>
                <input defaultValue={label === 'Username' ? user?.username : label === 'Email' ? user?.email : '+1 555 0100'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border2)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
              </div>
            ))}
            <button onClick={() => addToast('Profile saved!', 'success')}
              style={{ alignSelf: 'flex-start', padding: '10px 24px', borderRadius: 8, background: 'var(--gold)', color: '#000', fontWeight: 700, fontSize: 13 }}>
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
