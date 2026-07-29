import { useCallback, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import type { SubScreen, Tab } from './types'
import { cards } from './data/mockData'
import { useTelegramBackButton, useTelegramInit } from './hooks/useTelegram'
import { useToast } from './hooks/useToast'
import ScreenTransition from './components/ScreenTransition'
import Toast from './components/Toast'
import TabBar from './components/TabBar'
import BackgroundDecor from './components/BackgroundDecor'
import CardsScreen from './screens/CardsScreen'
import CardsListScreen from './screens/CardsListScreen'
import SettingsScreen from './screens/SettingsScreen'
import DepositScreen from './screens/DepositScreen'
import SendScreen from './screens/SendScreen'
import HistoryScreen from './screens/HistoryScreen'

function BackChevron({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Назад"
      className="glass mb-2 flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-transform active:scale-90"
    >
      <ChevronLeft size={18} strokeWidth={2.5} />
    </button>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [subScreen, setSubScreen] = useState<SubScreen | null>(null)
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  const { message, showToast } = useToast()

  useTelegramInit()

  const closeSub = useCallback(() => setSubScreen(null), [])
  useTelegramBackButton(subScreen !== null, closeSub)

  return (
    <div className="relative min-h-screen">
      <BackgroundDecor />

      <div className="relative mx-auto min-h-screen max-w-md">
        {subScreen && (
          <div className="px-4 pt-4">
            <BackChevron onClick={closeSub} />
          </div>
        )}

        <ScreenTransition id={subScreen ?? tab}>
          {subScreen === null && tab === 'home' && (
            <CardsScreen
              activeIndex={activeCardIndex}
              onChangeIndex={setActiveCardIndex}
              onDeposit={() => setSubScreen('deposit')}
              onSend={() => setSubScreen('send')}
              onHistory={() => setSubScreen('history')}
            />
          )}
          {subScreen === null && tab === 'cards' && (
            <CardsListScreen onSelect={setActiveCardIndex} onNavigateHome={() => setTab('home')} />
          )}
          {subScreen === null && tab === 'settings' && <SettingsScreen />}

          {subScreen === 'deposit' && (
            <DepositScreen
              initialCurrency={cards[activeCardIndex].currency}
              onDeposited={() => {
                showToast('Транзакция отправлена')
                closeSub()
              }}
            />
          )}
          {subScreen === 'send' && (
            <SendScreen
              currency={cards[activeCardIndex].currency}
              onSent={() => {
                showToast('Транзакция отправлена')
                closeSub()
              }}
            />
          )}
          {subScreen === 'history' && <HistoryScreen />}
        </ScreenTransition>

        {subScreen === null && <TabBar active={tab} onChange={setTab} />}
      </div>

      <Toast message={message} />
    </div>
  )
}
