import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

type DatePickerProps = {
  value: string // YYYY-MM-DD
  onChange: (value: string) => void
  min?: string // YYYY-MM-DD
  placeholder?: string
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseDateString(str: string): Date {
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function DatePicker({ value, onChange, min, placeholder = 'Select a date' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // The month currently being viewed in the calendar
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value) return parseDateString(value)
    return new Date()
  })

  // Keep viewDate in sync when value changes externally
  useEffect(() => {
    if (value) {
      const parsed = parseDateString(value)
      setViewDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedDate = value ? parseDateString(value) : null
  const minDate = min ? parseDateString(min) : null
  const today = new Date()

  const viewYear = viewDate.getFullYear()
  const viewMonth = viewDate.getMonth()

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1)
  const startDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = []

  // Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(viewYear, viewMonth - 1, daysInPrevMonth - i),
      isCurrentMonth: false,
    })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      date: new Date(viewYear, viewMonth, d),
      isCurrentMonth: true,
    })
  }

  // Next month leading days (fill to 42 for 6 rows, or fewer if possible)
  const totalCells = calendarDays.length <= 35 ? 35 : 42
  const remaining = totalCells - calendarDays.length
  for (let d = 1; d <= remaining; d++) {
    calendarDays.push({
      date: new Date(viewYear, viewMonth + 1, d),
      isCurrentMonth: false,
    })
  }

  const goToPrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonth - 1, 1))
  }

  const goToNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonth + 1, 1))
  }

  const isDisabled = (date: Date): boolean => {
    if (!minDate) return false
    // Compare date-only (strip time)
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const m = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    return d < m
  }

  const handleSelectDate = (date: Date) => {
    if (isDisabled(date)) return
    onChange(toDateString(date))
    setIsOpen(false)
  }

  const canGoPrev = (): boolean => {
    if (!minDate) return true
    // Allow going back if the prev month has at least one selectable day
    const prevMonthEnd = new Date(viewYear, viewMonth, 0)
    return prevMonthEnd >= minDate
  }

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : ''

  const monthLabel = firstDayOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 rounded-xl border-2 border-[#1F1410]/10 focus:border-[#1F1410]/20 focus:outline-none focus:ring-4 focus:ring-[#1F1410]/5 transition-all text-left flex items-center gap-3"
      >
        <Calendar className="w-4 h-4 text-[#1F1410]/30 flex-shrink-0" />
        {displayValue ? (
          <span className="text-[#1F1410]">{displayValue}</span>
        ) : (
          <span className="text-[#1F1410]/30">{placeholder}</span>
        )}
      </button>

      {/* Dropdown Calendar */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl border border-[#1F1410]/10 shadow-lg overflow-hidden">
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F1410]/5">
            <button
              type="button"
              onClick={goToPrevMonth}
              disabled={!canGoPrev()}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1F1410]/5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 text-[#1F1410]/60" />
            </button>
            <span className="text-sm font-semibold text-[#1F1410]">{monthLabel}</span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1F1410]/5 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[#1F1410]/60" />
            </button>
          </div>

          {/* Day-of-week Headers */}
          <div className="grid grid-cols-7 px-3 pt-2">
            {DAYS_OF_WEEK.map((day) => (
              <div key={day} className="text-center text-[10px] uppercase tracking-wider text-[#1F1410]/30 py-1.5 font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 px-3 pb-3">
            {calendarDays.map(({ date, isCurrentMonth }, idx) => {
              const disabled = isDisabled(date)
              const selected = selectedDate && isSameDay(date, selectedDate)
              const isToday = isSameDay(date, today)

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={disabled || !isCurrentMonth}
                  onClick={() => handleSelectDate(date)}
                  className={`
                    h-9 w-full rounded-lg text-sm transition-all relative
                    ${!isCurrentMonth ? 'text-[#1F1410]/15 cursor-default' : ''}
                    ${isCurrentMonth && disabled ? 'text-[#1F1410]/20 cursor-not-allowed' : ''}
                    ${isCurrentMonth && !disabled && !selected ? 'text-[#1F1410]/70 hover:bg-[#1F1410]/[0.04] cursor-pointer' : ''}
                    ${selected ? 'bg-[#14B8A6] text-white font-semibold shadow-sm' : ''}
                    ${isToday && !selected && isCurrentMonth ? 'font-semibold text-[#14B8A6]' : ''}
                  `}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 px-3 pb-3">
            <button
              type="button"
              onClick={() => {
                const d = new Date()
                d.setMonth(d.getMonth() + 6)
                handleSelectDate(d)
              }}
              className="flex-1 py-1.5 text-xs font-medium text-[#1F1410]/40 hover:text-[#1F1410]/60 hover:bg-[#1F1410]/[0.03] rounded-lg transition-colors"
            >
              6 months
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date()
                d.setFullYear(d.getFullYear() + 1)
                handleSelectDate(d)
              }}
              className="flex-1 py-1.5 text-xs font-medium text-[#1F1410]/40 hover:text-[#1F1410]/60 hover:bg-[#1F1410]/[0.03] rounded-lg transition-colors"
            >
              1 year
            </button>
            <button
              type="button"
              onClick={() => {
                const d = new Date()
                d.setFullYear(d.getFullYear() + 2)
                handleSelectDate(d)
              }}
              className="flex-1 py-1.5 text-xs font-medium text-[#1F1410]/40 hover:text-[#1F1410]/60 hover:bg-[#1F1410]/[0.03] rounded-lg transition-colors"
            >
              2 years
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
