import { Home, CreditCard, Gift, Settings } from 'lucide-react'
import type { Tab } from '../types'
import { hapticSelection } from '../hooks/useTelegram'

const TABS: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'cards', label: 'Карты', icon: CreditCard },
  { id: 'bonuses', label: 'Бонусы', icon: Gift },
  { id: 'settings', label: 'Настройки', icon: Settings },
]

interface Props {
  active: Tab
  onChange: (tab: Tab) => void
}

export default function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-md animate-fade-in items-center justify-around border-t border-white/15 bg-[#0a1a30]/60 px-2 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-2xl"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
      }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => {
              if (id !== active) hapticSelection()
              onChange(id)
            }}
            className="flex flex-1 flex-col items-center gap-1 py-1.5 transition-transform active:scale-90"
          >
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                isActive ? 'bg-accent/15 text-accent shadow-[0_0_16px_rgba(94,212,236,0.4)]' : 'text-white/45'
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
            </span>
            <span className={`text-[11px] font-medium transition-colors ${isActive ? 'text-accent' : 'text-white/45'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
