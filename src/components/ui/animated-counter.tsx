"use client"

import { useEffect, useState, useRef } from "react"

interface AnimatedCounterProps {
  end: number
  duration?: number
  className?: string
  suffix?: string
}

export function AnimatedCounter({ end, duration = 2000, className = "", suffix = "" }: AnimatedCounterProps) {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const counterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (counterRef.current) {
      observer.observe(counterRef.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return

    const startTime = Date.now()
    const endTime = startTime + duration

    const timer = setInterval(() => {
      const now = Date.now()
      const remaining = Math.max(endTime - now, 0)
      const rate = remaining / duration
      const currentCount = Math.round(end - rate * end)
      
      setCount(currentCount)

      if (remaining === 0) {
        clearInterval(timer)
      }
    }, 16) // ~60fps

    return () => clearInterval(timer)
  }, [isVisible, end, duration])

  return (
    <div ref={counterRef} className={className}>
      {count.toLocaleString()}{suffix}
    </div>
  )
} 