import { cards } from '../data/mockData'
import CardCarousel from '../components/CardCarousel'
import ActionButtons from '../components/ActionButtons'
import type { Screen } from '../types'

interface Props {
  activeIndex: number
  onChangeIndex: (index: number) => void
  navigate: (screen: Screen) => void
}

export default function CardsScreen({ activeIndex, onChangeIndex, navigate }: Props) {
  return (
    <div className="px-4 pb-8 pt-6">
      <div className="mb-5">
        <p className="text-sm text-white/50">Мои карты</p>
        <h1 className="text-2xl font-bold">Crypto Wallet</h1>
      </div>

      <CardCarousel cards={cards} activeIndex={activeIndex} onChange={onChangeIndex} />

      <ActionButtons
        onDeposit={() => navigate('deposit')}
        onSend={() => navigate('send')}
        onHistory={() => navigate('history')}
      />
    </div>
  )
}
