interface Props {
  onDeposit: () => void
  onSend: () => void
  onHistory: () => void
}

function ArrowDownIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12l7 7 7-7" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

export default function ActionButtons({ onDeposit, onSend, onHistory }: Props) {
  const items: { label: string; icon: JSX.Element; onClick: () => void }[] = [
    { label: 'Пополнить', icon: <ArrowDownIcon />, onClick: onDeposit },
    { label: 'Отправить', icon: <ArrowUpIcon />, onClick: onSend },
    { label: 'История', icon: <ClockIcon />, onClick: onHistory },
  ]

  return (
    <div className="mt-6 grid grid-cols-3 gap-3">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-3 py-4 shadow-md active:scale-95 transition-transform"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
            {item.icon}
          </span>
          <span className="text-xs font-medium text-white/80">{item.label}</span>
        </button>
      ))}
    </div>
  )
}
