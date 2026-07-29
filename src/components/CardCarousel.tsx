import { useRef, useState } from 'react'
import type { CryptoCardData } from '../types'
import CryptoCard from './CryptoCard'
import { hapticSelection } from '../hooks/useTelegram'

interface Props {
  cards: CryptoCardData[]
  activeIndex: number
  onChange: (index: number) => void
}

export default function CardCarousel({ cards, activeIndex, onChange }: Props) {
  const [dragOffset, setDragOffset] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const dragging = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    dragging.current = true
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current || touchStartX.current === null) return
    setDragOffset(e.touches[0].clientX - touchStartX.current)
  }

  const onTouchEnd = () => {
    dragging.current = false
    const threshold = 50
    if (dragOffset < -threshold && activeIndex < cards.length - 1) {
      onChange(activeIndex + 1)
      hapticSelection()
    } else if (dragOffset > threshold && activeIndex > 0) {
      onChange(activeIndex - 1)
      hapticSelection()
    }
    setDragOffset(0)
    touchStartX.current = null
  }

  return (
    <div className="w-full">
      <div
        className="overflow-hidden py-3"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(calc(${-activeIndex * 100}% + ${dragOffset}px))`,
            transitionDuration: dragging.current ? '0ms' : '300ms',
          }}
        >
          {cards.map((card) => (
            <div key={card.currency} className="w-full shrink-0 animate-float px-3">
              <CryptoCard card={card} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {cards.map((card, i) => (
          <button
            key={card.currency}
            aria-label={`Карта ${card.currency}`}
            onClick={() => {
              onChange(i)
              hapticSelection()
            }}
            className={`h-2 rounded-full transition-all ${
              i === activeIndex ? 'w-6 bg-accent shadow-[0_0_8px_rgba(0,212,170,0.7)]' : 'w-2 bg-white/20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
