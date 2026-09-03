import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

interface Props { value: number; prefix?: string; suffix?: string; decimals?: number; className?: string }

export default function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 2, className = '' }: Props) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`)
  const prevRef = useRef(0)

  useEffect(() => {
    const ctrl = animate(count, value, { duration: 0.6, ease: 'easeOut', from: prevRef.current })
    prevRef.current = value
    return ctrl.stop
  }, [value])

  return <motion.span className={className}>{rounded}</motion.span>
}
