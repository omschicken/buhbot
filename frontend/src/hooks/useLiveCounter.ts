import { useState, useEffect } from 'react'

export function useJackpot() {
  const [value, setValue] = useState(8241330)
  useEffect(() => {
    const id = setInterval(() => setValue((v) => v + Math.floor(Math.random() * 150 + 50)), 1200)
    return () => clearInterval(id)
  }, [])
  return value
}

export function usePaidToday() {
  const [value, setValue] = useState(2140320)
  useEffect(() => {
    const id = setInterval(() => setValue((v) => v + Math.floor(Math.random() * 500 + 100)), 2000)
    return () => clearInterval(id)
  }, [])
  return value
}

export function useOnlinePlayers() {
  const [value, setValue] = useState(14821)
  useEffect(() => {
    const id = setInterval(() => {
      setValue((v) => Math.max(14000, v + Math.floor(Math.random() * 40) - 20))
    }, 3000)
    return () => clearInterval(id)
  }, [])
  return value
}
