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
import HomeScreen from './screens/HomeScreen'
import CardsListScreen from './screens/CardsListScreen'
import CardDetailScreen from './screens/CardDetailScreen'
import BonusesScreen from './screens/BonusesScreen'
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
  const [balanceHidden, setBalanceHidden] = useState(false)
  const { message, showToast } = useToast()

  useTelegramInit()

  const closeSub = useCallback(() => setSubScreen(null), [])
  useTelegramBackButton(subScreen !== null, closeSub)

  const handleShare = () => {
    navigator.clipboard?.writeText('https://t.me/CryptoWalletBot?start=ref_AM4832').catch(() => {})
    showToast('Ссылка скопирована')
  }

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
            <HomeScreen
              activeIndex={activeCardIndex}
              onChangeIndex={setActiveCardIndex}
              balanceHidden={balanceHidden}
              onToggleBalance={() => setBalanceHidden((v) => !v)}
              onDeposit={() => setSubScreen('deposit')}
              onSend={() => setSubScreen('send')}
              onHistory={() => setSubScreen('history')}
              onViewAllCards={() => setTab('cards')}
              onOpenBonuses={() => setTab('bonuses')}
              onOpenCard={() => setSubScreen('cardDetail')}
            />
          )}
          {subScreen === null && tab === 'cards' && (
            <CardsListScreen
              onSelect={setActiveCardIndex}
              onOpenDetail={() => setSubScreen('cardDetail')}
            />
          )}
          {subScreen === null && tab === 'bonuses' && <BonusesScreen onShare={handleShare} />}
          {subScreen === null && tab === 'settings' && <SettingsScreen />}

          {subScreen === 'cardDetail' && (
            <CardDetailScreen
              card={cards[activeCardIndex]}
              onDeposit={() => setSubScreen('deposit')}
              onSend={() => setSubScreen('send')}
              onHistory={() => setSubScreen('history')}
            />
          )}

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
