import { useCallback, useState } from 'react'
import type { Screen } from './types'
import { cards } from './data/mockData'
import { useTelegramBackButton, useTelegramInit } from './hooks/useTelegram'
import { useToast } from './hooks/useToast'
import ScreenTransition from './components/ScreenTransition'
import Toast from './components/Toast'
import CardsScreen from './screens/CardsScreen'
import DepositScreen from './screens/DepositScreen'
import SendScreen from './screens/SendScreen'
import HistoryScreen from './screens/HistoryScreen'

function BackChevron({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Назад"
      className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-white/80 active:scale-90 transition-transform"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('cards')
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  const { message, showToast } = useToast()

  useTelegramInit()

  const back = useCallback(() => setScreen('cards'), [])
  useTelegramBackButton(screen !== 'cards', back)

  const navigate = (next: Screen) => setScreen(next)

  return (
    <div className="mx-auto min-h-screen max-w-md bg-base">
      {screen !== 'cards' && (
        <div className="px-4 pt-4">
          <BackChevron onClick={back} />
        </div>
      )}

      <ScreenTransition id={screen}>
        {screen === 'cards' && (
          <CardsScreen activeIndex={activeCardIndex} onChangeIndex={setActiveCardIndex} navigate={navigate} />
        )}
        {screen === 'deposit' && (
          <DepositScreen
            initialCurrency={cards[activeCardIndex].currency}
            onDeposited={() => {
              showToast('Транзакция отправлена')
              back()
            }}
          />
        )}
        {screen === 'send' && (
          <SendScreen
            currency={cards[activeCardIndex].currency}
            onSent={() => {
              showToast('Транзакция отправлена')
              back()
            }}
          />
        )}
        {screen === 'history' && <HistoryScreen />}
      </ScreenTransition>

      <Toast message={message} />
    </div>
  )
}
