import { cards } from '../data/mockData'
import CardCarousel from '../components/CardCarousel'
import ActionButtons from '../components/ActionButtons'

interface Props {
  activeIndex: number
  onChangeIndex: (index: number) => void
  onDeposit: () => void
  onSend: () => void
  onHistory: () => void
}

export default function CardsScreen({ activeIndex, onChangeIndex, onDeposit, onSend, onHistory }: Props) {
  return (
    <div className="px-4 pb-28 pt-6">
      <div className="mb-2 animate-fade-in">
        <p className="text-sm text-white/50">Мои карты</p>
        <h1 className="text-2xl font-bold">Crypto Wallet</h1>
      </div>

      <CardCarousel cards={cards} activeIndex={activeIndex} onChange={onChangeIndex} />

      <ActionButtons onDeposit={onDeposit} onSend={onSend} onHistory={onHistory} />
    </div>
  )
}
