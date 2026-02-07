import { ChevronDown } from 'lucide-react'
import { isSameMonth, formatMonth } from '../lib/dateUtils'
import { useMemo, useState, useRef, useEffect } from 'react'

// Re-export date utilities for backwards compatibility
export { getMonthRange, getMonthData, formatMonth, isSameMonth } from '../lib/dateUtils'

type MonthPickerProps = {
  selectedMonth: Date
  onMonthChange: (month: Date) => void
  className?: string
}

export function MonthPicker({ selectedMonth, onMonthChange, className = '' }: MonthPickerProps) {
  const now = new Date()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selectedRef = useRef<HTMLButtonElement>(null)

  const months = useMemo(() => {
    const result: Date[] = []
    for (let i = -24; i <= 6; i++) {
      result.push(new Date(now.getFullYear(), now.getMonth() + i, 1))
    }
    return result
  }, [now.getFullYear(), now.getMonth()])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Scroll selected month into view within the dropdown (not the page)
  useEffect(() => {
    if (open && selectedRef.current && listRef.current) {
      const list = listRef.current
      const item = selectedRef.current
      list.scrollTop = item.offsetTop - list.clientHeight / 2 + item.clientHeight / 2
    }
  }, [open])

  const handleSelect = (month: Date) => {
    onMonthChange(month)
    setOpen(false)
  }

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-lg font-bold text-[#1F1410] px-2 py-1 rounded-lg hover:bg-[#1F1410]/5 transition-colors cursor-pointer"
      >
        {formatMonth(selectedMonth)}
        <ChevronDown className={`w-4 h-4 text-[#1F1410]/60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div ref={listRef} className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-[#1F1410]/10 py-1 max-h-64 overflow-y-auto overscroll-contain z-50 min-w-[180px]">
          {months.map((month) => {
            const isSelected = isSameMonth(month, selectedMonth)
            const label = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            return (
              <button
                key={`${month.getFullYear()}-${month.getMonth()}`}
                ref={isSelected ? selectedRef : undefined}
                onClick={() => handleSelect(month)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-[#14B8A6]/10 text-[#14B8A6] font-semibold'
                    : 'text-[#1F1410] hover:bg-[#1F1410]/5'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
