/**
 * Date utility functions
 * Centralized date manipulation and formatting
 */

/**
 * Get the start and end dates for a given month (ISO strings)
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
 * Format a month for display (e.g., "January 2024")
 */
export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Check if two dates are in the same month
 */
export function isSameMonth(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  )
}

/**
 * Format a date string for display (e.g., "Jan 15")
 */
export function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format a date string with full format (e.g., "January 15, 2024")
 */
export function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Create a date for the first of a given month
 */
export function getFirstOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1)
}

/**
 * Get months between two dates
 */
export function getMonthsBetween(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
}

/**
 * Generate a month key for grouping (e.g., "2024-01")
 */
export function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
