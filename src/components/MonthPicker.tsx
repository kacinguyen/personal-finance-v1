import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatMonth, isSameMonth } from '../lib/dateUtils'

// Re-export date utilities for backwards compatibility
export { getMonthRange, getMonthData, formatMonth, isSameMonth } from '../lib/dateUtils'

type MonthPickerProps = {
  selectedMonth: Date
  onMonthChange: (month: Date) => void
  className?: string
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
