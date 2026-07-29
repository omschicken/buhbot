import type { ReactNode } from 'react'

export default function ScreenTransition({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div key={id} className="animate-screen-in">
      {children}
    </div>
  )
}
