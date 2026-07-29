import CryptoCard from '../components/CryptoCard'
import SecureField from '../components/SecureField'
import ActionButtons from '../components/ActionButtons'
import type { CryptoCardData } from '../types'

interface Props {
  card: CryptoCardData
  onDeposit: () => void
  onSend: () => void
  onHistory: () => void
}

export default function CardDetailScreen({ card, onDeposit, onSend, onHistory }: Props) {
  return (
    <div className="px-4 pb-8 pt-2">
      <div className="animate-fade-in">
        <CryptoCard card={card} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <SecureField label="Действует до" maskedValue="••/••" realValue={card.expiry} />
        <SecureField label="CVV" maskedValue="•••" realValue={card.cvv} />
      </div>

      <ActionButtons onDeposit={onDeposit} onSend={onSend} onHistory={onHistory} />
    </div>
  )
}
