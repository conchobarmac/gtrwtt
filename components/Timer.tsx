'use client'

import { useEffect, useState } from 'react'

interface Props {
  startedAt: string
  durationSeconds: number
  onExpire?: () => void
}

export function Timer({ startedAt, durationSeconds, onExpire }: Props) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
    return Math.max(0, durationSeconds - elapsed)
  })

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - new Date(startedAt).getTime()) / 1000
      const remaining = Math.max(0, durationSeconds - elapsed)
      setSecondsLeft(remaining)
      if (remaining === 0) onExpire?.()
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt, durationSeconds, onExpire])

  const mins = Math.floor(secondsLeft / 60)
  const secs = Math.floor(secondsLeft % 60)
  const pct = (secondsLeft / durationSeconds) * 100
  const isLow = secondsLeft <= 60

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-slate-500">Time remaining</span>
        <span className={`text-2xl font-mono font-semibold tabular-nums ${isLow ? 'text-red-500' : 'text-slate-800'}`}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-red-400' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
