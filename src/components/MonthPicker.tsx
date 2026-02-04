import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

type MonthPickerProps = {
  selectedMonth: Date
  onMonthChange: (month: Date) => void
  className?: string
}

/**
 * Get the start and end dates for a given month
 */
export function getMonthRange(month: Date): { startOfMonth: string; endOfMonth: string } {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const startOfMonth = new Date(year, monthIndex, 1).toISOString().split('T')[0]
  const endOfMonth = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0]
  return { startOfMonth, endOfMonth }
}

/**
 * Get month metadata (days in month, days elapsed, days remaining)
 */
export function getMonthData(month: Date): {
  daysInMonth: number
  daysElapsed: number
  daysRemaining: number
  monthName: string
  isCurrentMonth: boolean
} {
  const now = new Date()
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const monthName = month.toLocaleDateString('en-US', { month: 'long' })

  const isCurrentMonth =
    now.getFullYear() === year && now.getMonth() === monthIndex

  // For current month, use actual elapsed days
  // For past months, all days are elapsed
  // For future months, no days are elapsed
  let daysElapsed: number
  if (isCurrentMonth) {
    daysElapsed = now.getDate()
  } else if (month < now) {
    daysElapsed = daysInMonth
  } else {
    daysElapsed = 0
  }

  const daysRemaining = daysInMonth - daysElapsed

  return { daysInMonth, daysElapsed, daysRemaining, monthName, isCurrentMonth }
}

/**
 * Format a month for display
 */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Check if a date is in the same month as another date
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  )
}

export function MonthPicker({ selectedMonth, onMonthChange, className = '' }: MonthPickerProps) {
  const now = new Date()
  const isCurrentMonth = isSameMonth(selectedMonth, now)

  const goToPreviousMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    onMonthChange(newMonth)
  }

  const goToNextMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
    onMonthChange(newMonth)
  }

  const goToCurrentMonth = () => {
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={goToPreviousMonth}
        className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeft className="w-5 h-5 text-[#1F1410]/60" />
      </motion.button>

      <button
        onClick={goToCurrentMonth}
        className="min-w-[160px] text-center group"
      >
        <span className="text-lg font-bold text-[#1F1410] group-hover:text-[#6366F1] transition-colors">
          {formatMonth(selectedMonth)}
        </span>
        {!isCurrentMonth && (
          <span className="block text-[10px] text-[#6366F1] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Click to return to current month
          </span>
        )}
      </button>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={goToNextMonth}
        className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
        aria-label="Next month"
      >
        <ChevronRight className="w-5 h-5 text-[#1F1410]/60" />
      </motion.button>
    </div>
  )
}
