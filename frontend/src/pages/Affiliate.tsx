import { useUIStore } from '../store/useUIStore'
import { motion } from 'framer-motion'

const DATA = {
  code: 'ROOBET-X7K2',
  link: 'https://roobet.io/ref/ROOBET-X7K2',
  commission: 35,
  referrals: 47,
  active: 23,
  earned: 3840.50,
  monthly: [120, 240, 180, 350, 420, 380, 290, 460, 510, 380, 420, 490],
  months: ['J','F','M','A','M','J','J','A','S','O','N','D'],
}

const maxM = Math.max(...DATA.monthly)

export default function Affiliate() {
  const { addToast } = useUIStore()
  const copy = () => { navigator.clipboard.writeText(DATA.link); addToast('Link copied!', 'success') }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 3, height: 24, background: '#e4a832', borderRadius: 2 }} />
        <span style={{ fontSize: 14, fontWeight: 700 }}>Affiliate Dashboard</span>
      </div>

      {/* Ref link */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: '#444', letterSpacing: 0.5, marginBottom: 8 }}>YOUR REFERRAL LINK</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <code style={{ flex: 1, background: '#111', border: '1px solid #2a2a2a', borderRadius: 7, padding: '8px 12px', fontSize: 11, color: '#e4a832', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{DATA.link}</code>
          <button onClick={copy} style={{ background: '#e4a832', color: '#000', fontWeight: 800, fontSize: 11, padding: '8px 16px', borderRadius: 7, border: 'none', flexShrink: 0 }}>Copy</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {([['REFERRALS', DATA.referrals, '#e4a832'], ['ACTIVE', DATA.active, '#22c55e'], ['COMMISSION', `${DATA.commission}%`, '#0ea5e9'], ['EARNED', `$${DATA.earned.toLocaleString()}`, '#e4a832']] as const).map(([l, v, c]) => (
          <motion.div key={l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{typeof v === 'number' ? v : v}</div>
            <div style={{ fontSize: 9, color: '#444', letterSpacing: 0.5, marginTop: 4 }}>{l}</div>
          </motion.div>
        ))}
      </div>

      {/* Bar chart */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 14 }}>Monthly Earnings</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
          {DATA.monthly.map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <motion.div initial={{ height: 0 }} animate={{ height: `${(v / maxM) * 80}px` }} transition={{ duration: 0.5, delay: i * 0.04 }}
                style={{ width: '100%', background: 'linear-gradient(to top, #e4a832, #e4a83260)', borderRadius: '3px 3px 0 0', minHeight: 3 }} />
              <span style={{ fontSize: 8, color: '#444' }}>{DATA.months[i]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12 }}>How it works</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {([['Share link', 'Share your referral link with friends'], ['They sign up', 'They register and deposit'], ['You earn', '35% commission forever']] as const).map(([t, d], i) => (
            <div key={t} style={{ textAlign: 'center', padding: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e4a83215', border: '1px solid #e4a83240', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#e4a832' }}>{i + 1}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{t}</div>
              <div style={{ fontSize: 10, color: '#444' }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
