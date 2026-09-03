import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getWallet, getTransactions, withdraw } from '../api/wallet'
import { useAuthStore } from '../store/authStore'

const mockTx = [
  { id: '1', type: 'deposit', amount: 500, status: 'completed', createdAt: '2024-01-15' },
  { id: '2', type: 'bet', amount: -50, status: 'completed', createdAt: '2024-01-15' },
  { id: '3', type: 'win', amount: 120, status: 'completed', createdAt: '2024-01-15' },
  { id: '4', type: 'withdrawal', amount: -200, status: 'pending', createdAt: '2024-01-14' },
]

const statusColor: Record<string, string> = {
  completed: 'bg-green-500/20 text-green-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  failed: 'bg-red-500/20 text-red-400',
}

export default function WalletPage() {
  const balance = useAuthStore((s) => s.balance)
  const [showDeposit, setShowDeposit] = useState(false)
  const [amount, setAmount] = useState('')
  const [address, setAddress] = useState('')
  const [withdrawMsg, setWithdrawMsg] = useState('')

  const { data: txData } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
    retry: false,
  })

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: getWallet,
    retry: false,
  })

  const displayBalance = walletData?.data?.balance ?? balance

  const transactions = txData?.data?.transactions || txData?.data || mockTx

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await withdraw(Number(amount), address)
      setWithdrawMsg('Withdrawal submitted successfully!')
      setAmount('')
      setAddress('')
    } catch {
      setWithdrawMsg('Withdrawal failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-white mb-8">Wallet</h1>

        {/* Balance card */}
        <div className="bg-gradient-to-r from-[#0f3460] to-[#16213e] rounded-xl border border-[#00ff88]/20 p-8 mb-6 text-center">
          <p className="text-gray-400 mb-2">Available Balance</p>
          <div className="text-6xl font-black text-[#00ff88] mb-6">
            ${displayBalance.toFixed(2)}
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowDeposit(true)}
              className="bg-[#00ff88] text-[#1a1a2e] font-bold rounded-lg px-6 py-3 hover:bg-[#00cc70] transition-all"
            >
              Deposit
            </button>
          </div>
        </div>

        {/* Deposit modal */}
        {showDeposit && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowDeposit(false)}>
            <div className="bg-[#16213e] rounded-xl border border-white/10 p-8 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-white mb-4">Deposit Crypto</h2>
              <div className="bg-[#0f3460] rounded-lg p-6 text-center mb-4">
                <div className="w-32 h-32 bg-white/10 rounded-lg mx-auto mb-3 flex items-center justify-center text-4xl">
                  📱
                </div>
                <p className="text-xs text-gray-400 mb-2">Send BTC to:</p>
                <p className="text-xs text-[#00ff88] font-mono break-all">bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh</p>
              </div>
              <p className="text-xs text-gray-500 text-center mb-4">Minimum deposit: $10. Confirmations: 3</p>
              <button onClick={() => setShowDeposit(false)} className="w-full bg-[#00ff88] text-[#1a1a2e] font-bold rounded-lg py-3 hover:bg-[#00cc70] transition-all">
                Done
              </button>
            </div>
          </div>
        )}

        {/* Withdraw */}
        <div className="bg-[#16213e] rounded-xl border border-white/5 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Withdraw</h2>
          <form onSubmit={handleWithdraw} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Amount (USD)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                min="10"
                required
                className="w-full bg-[#0f3460] border border-[#00ff88]/20 text-white rounded-lg px-4 py-3 focus:border-[#00ff88] focus:outline-none placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Wallet Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="bc1q..."
                required
                className="w-full bg-[#0f3460] border border-[#00ff88]/20 text-white rounded-lg px-4 py-3 focus:border-[#00ff88] focus:outline-none placeholder-gray-600"
              />
            </div>
            {withdrawMsg && (
              <p className={`text-sm ${withdrawMsg.includes('success') ? 'text-[#00ff88]' : 'text-red-400'}`}>{withdrawMsg}</p>
            )}
            <button type="submit" className="bg-[#00ff88] text-[#1a1a2e] font-bold rounded-lg px-6 py-3 hover:bg-[#00cc70] transition-all">
              Withdraw
            </button>
          </form>
        </div>

        {/* Transactions */}
        <div className="bg-[#16213e] rounded-xl border border-white/5 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Transaction History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 border-b border-white/5">
                  <th className="text-left pb-3">Date</th>
                  <th className="text-left pb-3">Type</th>
                  <th className="text-right pb-3">Amount</th>
                  <th className="text-right pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx: { id: string; type: string; amount: number; status: string; createdAt: string }) => (
                  <tr key={tx.id} className="hover:bg-white/2">
                    <td className="py-3 text-gray-400">{tx.createdAt}</td>
                    <td className="py-3 text-gray-300 capitalize">{tx.type}</td>
                    <td className={`py-3 text-right font-semibold ${tx.amount > 0 ? 'text-[#00ff88]' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor[tx.status] || 'bg-gray-500/20 text-gray-400'}`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
