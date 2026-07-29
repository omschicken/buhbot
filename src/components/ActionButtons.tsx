import { ArrowDownToLine, ArrowUpFromLine, History } from 'lucide-react'

interface Props {
  onDeposit: () => void
  onSend: () => void
  onHistory: () => void
}

export default function ActionButtons({ onDeposit, onSend, onHistory }: Props) {
  const items = [
    { label: 'Пополнить', icon: ArrowDownToLine, onClick: onDeposit },
    { label: 'Отправить', icon: ArrowUpFromLine, onClick: onSend },
    { label: 'История', icon: History, onClick: onHistory },
  ]

  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      {items.map((item, i) => (
        <button
          key={item.label}
          onClick={item.onClick}
          style={{ animationDelay: `${i * 70}ms` }}
          className="glass flex animate-fade-in flex-col items-center gap-2 rounded-2xl px-3 py-4 transition-transform active:scale-95"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/25 bg-accent/15 text-accent">
            <item.icon size={19} strokeWidth={2.1} />
          </span>
          <span className="text-xs font-medium text-white/80">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
