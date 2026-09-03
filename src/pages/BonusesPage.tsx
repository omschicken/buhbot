import { useQuery } from '@tanstack/react-query'
import { getBonuses } from '../api/bonuses'

const mockBonuses = [
  { id: '1', type: 'welcome', amount: 500, currency: 'USD', wagering: 30, wagerCompleted: 450, wagerRequired: 15000, expiresAt: '2024-02-15' },
  { id: '2', type: 'free-spin', amount: 50, currency: 'FS', wagering: 40, wagerCompleted: 2000, wagerRequired: 5000, expiresAt: '2024-01-20' },
]

const bonusColors: Record<string, { bg: string; text: string; label: string }> = {
  welcome: { bg: 'from-purple-900 to-purple-700', text: 'text-purple-300', label: '🎁 Welcome Bonus' },
  'free-spin': { bg: 'from-blue-900 to-blue-700', text: 'text-blue-300', label: '🌀 Free Spins' },
  deposit: { bg: 'from-green-900 to-green-700', text: 'text-green-300', label: '💰 Deposit Bonus' },
}

function daysLeft(date: string) {
  const diff = new Date(date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export default function BonusesPage() {
  const { data } = useQuery({
    queryKey: ['bonuses'],
    queryFn: getBonuses,
    retry: false,
  })

  const bonuses = data?.data?.bonuses || data?.data || mockBonuses

  return (
    <div className="min-h-screen bg-[#1a1a2e] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-white">Bonuses</h1>
          <span className="text-gray-400 text-sm">{bonuses.length} active</span>
        </div>

        {bonuses.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No active bonuses. Check back later!
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {bonuses.map((bonus: { id: string; type: string; amount: number; currency: string; wagering: number; wagerCompleted: number; wagerRequired: number; expiresAt: string }) => {
              const config = bonusColors[bonus.type] || bonusColors.deposit
              const pct = Math.min(100, Math.round((bonus.wagerCompleted / bonus.wagerRequired) * 100))
              const days = daysLeft(bonus.expiresAt)

              return (
                <div key={bonus.id} className="bg-[#16213e] rounded-xl border border-white/5 overflow-hidden">
                  <div className={`bg-gradient-to-r ${config.bg} p-5`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full bg-black/20 ${days < 3 ? 'text-red-400' : 'text-gray-300'}`}>
                        {days}d left
                      </span>
                    </div>
                    <div className="text-3xl font-black text-white">
                      {bonus.amount} {bonus.currency}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                      <span>Wagering Progress</span>
                      <span className="text-white font-medium">{pct}%</span>
                    </div>
                    <div className="h-2 bg-[#0f3460] rounded-full overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc70] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>${bonus.wagerCompleted.toLocaleString()} completed</span>
                      <span>${bonus.wagerRequired.toLocaleString()} required</span>
                    </div>
                    <div className="mt-3 text-xs text-gray-600">
                      {bonus.wagering}x wagering requirement
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Promo code */}
        <div className="bg-[#16213e] rounded-xl border border-white/5 p-6 mt-6">
          <h2 className="text-lg font-bold text-white mb-3">Have a Promo Code?</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter promo code"
              className="flex-1 bg-[#0f3460] border border-[#00ff88]/20 text-white rounded-lg px-4 py-3 focus:border-[#00ff88] focus:outline-none placeholder-gray-600"
            />
            <button className="bg-[#00ff88] text-[#1a1a2e] font-bold rounded-lg px-6 py-3 hover:bg-[#00cc70] transition-all whitespace-nowrap">
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
