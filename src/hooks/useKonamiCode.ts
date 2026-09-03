import { useEffect, useRef } from 'react'

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']

export function useKonamiCode(onSuccess: () => void) {
  const seqRef = useRef<string[]>([])
  const cbRef = useRef(onSuccess)
  cbRef.current = onSuccess
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      seqRef.current = [...seqRef.current, e.key].slice(-KONAMI.length)
      if (seqRef.current.join(',') === KONAMI.join(',')) cbRef.current()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
}
