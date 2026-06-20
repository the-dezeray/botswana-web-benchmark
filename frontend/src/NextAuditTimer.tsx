import { useEffect, useState } from 'react'
import { Watch } from 'react-loader-spinner'

interface TimeRemaining {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export function NextAuditTimer() {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null)

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date()
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      const diff = endOfMonth.getTime() - now.getTime()

      if (diff <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      }

      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      }
    }

    // Initial calculation
    setTimeRemaining(calculateTimeRemaining())

    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!timeRemaining) return null

  return (
    <div className="next-audit-timer">
      <Watch 
        visible={true} 
        height="24" 
        width="24" 
        radius="24" 
        color="#4fa94d" 
        ariaLabel="watch-loading"
      />
      <div className="timer-countdown">
        <span className="time-value">{timeRemaining.days}d</span>
        <span className="time-value">{String(timeRemaining.hours).padStart(2, '0')}h</span>
        <span className="time-value">{String(timeRemaining.minutes).padStart(2, '0')}m</span>
      </div>
    </div>
  )
}
