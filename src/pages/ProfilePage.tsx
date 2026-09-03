import { useAuthStore } from '../store/authStore'

const vipLevels = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']

const kycColors: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function ProfilePage() {
  const { user, balance } = useAuthStore()

  const mockUser = {
    email: user?.email || 'player@casino.pro',
    username: user?.username || 'Player123',
    kycStatus: user?.kycStatus || 'pending',
  }

  const vipProgress = 42 // percent through current level
  const currentLevel = 1 // Silver

  return (
    <div className="min-h-screen bg-[#1a1a2e] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-black text-white">Profile</h1>

        {/* User info */}
        <div className="bg-[#16213e] rounded-xl border border-white/5 p-6 flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00ff88] to-[#0f3460] flex items-center justify-center text-3xl font-black text-[#1a1a2e] flex-shrink-0">
            {mockUser.username[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white">{mockUser.username}</h2>
            <p className="text-gray-400 text-sm">{mockUser.email}</p>
            <p className="text-gray-500 text-sm mt-1">Member since January 2024</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">Balance</p>
            <p className="text-2xl font-bold text-[#00ff88]">${balance.toFixed(2)}</p>
          </div>
        </div>

        {/* KYC */}
        <div className="bg-[#16213e] rounded-xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-white mb-4">KYC Verification</h3>
          <div className="flex items-center justify-between">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border capitalize ${kycColors[mockUser.kycStatus] || kycColors.pending}`}>
                {mockUser.kycStatus}
              </span>
              <p className="text-gray-500 text-sm mt-2">
                {mockUser.kycStatus === 'pending' && 'Submit your documents to verify your identity'}
                {mockUser.kycStatus === 'approved' && 'Your identity has been verified'}
                {mockUser.kycStatus === 'rejected' && 'Verification failed. Please resubmit.'}
              </p>
            </div>
            <button className="bg-[#00ff88] text-[#1a1a2e] font-bold rounded-lg px-5 py-2.5 hover:bg-[#00cc70] transition-all text-sm">
              Upload Docs
            </button>
          </div>
        </div>

        {/* VIP Level */}
        <div className="bg-[#16213e] rounded-xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-white mb-4">VIP Status</h3>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#00ff88] font-bold">{vipLevels[currentLevel]}</span>
            <span className="text-gray-400 text-sm">{vipProgress}% to {vipLevels[currentLevel + 1]}</span>
          </div>
          <div className="h-2 bg-[#0f3460] rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-[#00ff88] to-[#00cc70] rounded-full transition-all"
              style={{ width: `${vipProgress}%` }}
            />
          </div>
          <div className="flex justify-between">
            {vipLevels.map((level, i) => (
              <div key={level} className="text-center">
                <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${i <= currentLevel ? 'bg-[#00ff88]' : 'bg-white/10'}`} />
                <span className={`text-xs ${i <= currentLevel ? 'text-[#00ff88]' : 'text-gray-600'}`}>{level}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rakeback */}
        <div className="bg-[#16213e] rounded-xl border border-white/5 p-6">
          <h3 className="text-lg font-bold text-white mb-2">Rakeback Rate</h3>
          <div className="flex items-center gap-3">
            <div className="text-4xl font-black text-[#00ff88]">15%</div>
            <div className="text-gray-400 text-sm">
              <p>Weekly rakeback on all bets</p>
              <p className="text-[#00ff88] text-xs mt-0.5">Paid every Monday</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Wagered', value: '$12,450.00' },
            { label: 'Total Won', value: '$14,200.00' },
            { label: 'Win Rate', value: '54.2%' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#16213e] rounded-xl border border-white/5 p-4 text-center">
              <div className="text-xl font-bold text-[#00ff88]">{stat.value}</div>
              <div className="text-gray-400 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
