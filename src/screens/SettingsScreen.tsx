import { Bell, ChevronRight, Info, Palette, Shield } from 'lucide-react'

const ITEMS = [
  { icon: Bell, label: 'Уведомления' },
  { icon: Shield, label: 'Безопасность и приватность' },
  { icon: Palette, label: 'Тема оформления' },
  { icon: Info, label: 'О приложении' },
]

export default function SettingsScreen() {
  return (
    <div className="px-4 pb-28 pt-6">
      <h1 className="mb-6 animate-fade-in text-2xl font-bold">Настройки</h1>

      <div className="glass mb-6 flex animate-fade-in items-center gap-4 rounded-2xl p-4 shadow-lg">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/25 bg-accent/15 text-lg font-bold text-accent">
          AM
        </div>
        <div>
          <p className="font-semibold">Alex Morgan</p>
          <p className="text-sm text-white/50">@alexmorgan</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ITEMS.map(({ icon: Icon, label }, i) => (
          <button
            key={label}
            style={{ animationDelay: `${i * 70}ms` }}
            className="glass flex animate-fade-in items-center gap-3 rounded-2xl px-4 py-3.5 shadow-lg transition-transform active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-accent/25 bg-accent/15 text-accent">
              <Icon size={18} />
            </span>
            <span className="flex-1 text-left text-sm font-medium text-white/85">{label}</span>
            <ChevronRight size={16} className="text-white/30" />
          </button>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-white/30">Crypto Wallet · v0.1.0</p>
    </div>
  )
}
