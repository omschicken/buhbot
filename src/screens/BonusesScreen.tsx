import { Gift, Share2 } from 'lucide-react'

const TIER = { label: '1-й уровень', progress: 0, goal: 10, activation: '25%', subscription: '10%' }

interface Props {
  onShare: () => void
}

export default function BonusesScreen({ onShare }: Props) {
  const progressPct = Math.round((TIER.progress / TIER.goal) * 100)

  return (
    <div className="px-4 pb-28 pt-6">
      <h1 className="mb-1 animate-fade-in text-2xl font-bold">Бонусы</h1>
      <p className="mb-6 text-sm text-white/50">Рекомендуйте Crypto Wallet и получайте до 40% комиссии</p>

      <div className="glass mb-5 animate-fade-in rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/25 bg-accent/15 text-accent">
            <Gift size={18} />
          </span>
          <div className="flex-1">
            <p className="text-xs text-white/50">Текущий</p>
            <p className="text-sm font-semibold">{TIER.label}</p>
          </div>
          <p className="text-xs text-white/40">
            {TIER.progress}/{TIER.goal}
          </p>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-accent" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-white/50">Активация</p>
            <p className="font-semibold">{TIER.activation}</p>
          </div>
          <div>
            <p className="text-white/50">Подписка</p>
            <p className="font-semibold">{TIER.subscription}</p>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3">
        <div className="glass animate-fade-in rounded-2xl p-4">
          <p className="text-xs text-white/50">Доступно к выводу</p>
          <p className="mt-1 text-xl font-bold">$0</p>
          <button disabled className="mt-3 w-full rounded-xl bg-white/10 py-1.5 text-xs font-semibold text-white/40">
            Вывести
          </button>
        </div>
        <div className="glass animate-fade-in rounded-2xl p-4">
          <p className="text-xs text-white/50">Заказы в ожидании</p>
          <p className="mt-1 text-xl font-bold">0</p>
          <p className="mt-3 text-xs text-white/40">Всего заказов: 0</p>
        </div>
      </div>

      <button
        onClick={onShare}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 text-base font-bold text-[#10176e] shadow-[0_10px_40px_-8px_rgba(94,212,236,0.6)] transition-transform active:scale-[0.98]"
      >
        <Share2 size={17} /> Поделиться ссылкой
      </button>

      <p className="text-center text-xs text-white/30">Реферальная программа · демо-данные</p>
    </div>
  )
}
