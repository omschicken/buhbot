import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getAffiliate } from '../api/affiliate'

const mockAffiliate = {
  referralCode: 'CASINOPRO-X7K2',
  referralLink: 'https://casino.pro/ref/CASINOPRO-X7K2',
  commissionRate: 0.35,
  totalReferrals: 47,
  activePlayers: 23,
  totalEarnings: 3840.50,
  monthlyEarnings: [120, 240, 180, 350, 420, 380, 290, 460, 510, 380, 420, 490],
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function AffiliatePage() {
  const [copied, setCopied] = useState(false)

  const { data } = useQuery({
    queryKey: ['affiliate'],
    queryFn: getAffiliate,
    retry: false,
  })

  const aff = data?.data || mockAffiliate
  const maxEarning = Math.max(...aff.monthlyEarnings)

  const copyLink = () => {
    navigator.clipboard.writeText(aff.referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-black text-white">Affiliate Program</h1>

        {/* Referral link */}
        <div className="bg-[#16213e] rounded-xl border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-1">Your Referral Link</h2>
          <p className="text-gray-500 text-sm mb-4">Share this link and earn {Math.round(aff.commissionRate * 100)}% commission on every player's losses</p>
          <div className="flex gap-3">
            <div className="flex-1 bg-[#0f3460] border border-[#00ff88]/20 rounded-lg px-4 py-3 text-[#00ff88] font-mono text-sm truncate">
              {aff.referralLink}
            </div>
            <button
              onClick={copyLink}
              className={`px-5 py-3 rounded-lg font-bold text-sm transition-all ${copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-[#00ff88] text-[#1a1a2e] hover:bg-[#00cc70]'}`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="mt-3 text-xs text-gray-500">
            Promo code: <span className="text-[#00ff88] font-mono">{aff.referralCode}</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Referrals', value: aff.totalReferrals, suffix: '' },
            { label: 'Active Players', value: aff.activePlayers, suffix: '' },
            { label: 'Total Earned', value: `$${aff.totalEarnings.toLocaleString()}`, suffix: '' },
            { label: 'Commission Rate', value: `${Math.round(aff.commissionRate * 100)}%`, suffix: '' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#16213e] rounded-xl border border-white/5 p-5 text-center">
              <div className="text-2xl font-black text-[#00ff88]">{stat.value}</div>
              <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Earnings chart */}
        <div className="bg-[#16213e] rounded-xl border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-6">Monthly Earnings (2024)</h2>
          <div className="flex items-end gap-2 h-40">
            {aff.monthlyEarnings.map((val: number, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-gradient-to-t from-[#00ff88] to-[#00cc70] rounded-t opacity-80 hover:opacity-100 transition-opacity relative group"
                  style={{ height: `${(val / maxEarning) * 100}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-[#00ff88] font-medium opacity-0 group-hover:opacity-100 whitespace-nowrap">
                    ${val}
                  </div>
                </div>
                <span className="text-gray-600 text-xs">{months[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent referrals */}
        <div className="bg-[#16213e] rounded-xl border border-white/5 p-6">
          <h2 className="text-lg font-bold text-white mb-4">Recent Referrals</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-white/5">
                <th className="text-left pb-3">Player</th>
                <th className="text-left pb-3">Joined</th>
                <th className="text-right pb-3">Wagered</th>
                <th className="text-right pb-3">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { player: 'player***1', joined: '2024-01-10', wagered: 2400, earned: 84 },
                { player: 'user***7', joined: '2024-01-08', wagered: 1200, earned: 42 },
                { player: 'anon***3', joined: '2024-01-05', wagered: 800, earned: 28 },
                { player: 'lucky***9', joined: '2024-01-03', wagered: 3100, earned: 108.5 },
              ].map((ref, i) => (
                <tr key={i} className="hover:bg-white/2">
                  <td className="py-3 text-gray-300 font-mono">{ref.player}</td>
                  <td className="py-3 text-gray-400">{ref.joined}</td>
                  <td className="py-3 text-right text-gray-300">${ref.wagered.toLocaleString()}</td>
                  <td className="py-3 text-right text-[#00ff88] font-semibold">+${ref.earned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
