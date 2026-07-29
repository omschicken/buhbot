import { transactions } from '../data/mockData'
import type { Transaction } from '../types'

function DirectionIcon({ direction }: { direction: Transaction['direction'] }) {
  const isIn = direction === 'in'
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
        isIn ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {isIn ? <path d="M12 5v14M5 12l7 7 7-7" /> : <path d="M12 19V5M5 12l7-7 7 7" />}
      </svg>
    </span>
  )
}

function StatusBadge({ status }: { status: Transaction['status'] }) {
  const isCompleted = status === 'completed'
  return (
    <span
      className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isCompleted ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
      }`}
    >
      {isCompleted ? 'Выполнено' : 'В обработке'}
    </span>
  )
}

export default function HistoryScreen() {
  return (
    <div className="px-4 pb-8 pt-6">
      <h1 className="mb-6 text-2xl font-bold">История транзакций</h1>

      <div className="flex flex-col gap-3">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center gap-3 rounded-2xl bg-surface p-3.5">
            <DirectionIcon direction={tx.direction} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold">
                  {tx.direction === 'in' ? 'Получено' : 'Отправлено'} · {tx.currency}
                </p>
                <p className={`shrink-0 text-sm font-bold ${tx.direction === 'in' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.direction === 'in' ? '+' : '-'}
                  {tx.amount} {tx.currency}
                </p>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="truncate text-xs text-white/50">
                  {tx.counterparty} · {tx.date}
                </p>
                <StatusBadge status={tx.status} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
