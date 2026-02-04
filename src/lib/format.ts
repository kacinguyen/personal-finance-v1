/**
 * Formatting utilities for currency, numbers, and percentages
 * Single source of truth for all display formatting
 */

/**
 * Format a number as currency (no symbol)
 * @example formatNumber(1234.56) => "1,234.56"
 */
export function formatNumber(value: number): string {
  return value.toLocaleString()
}

/**
 * Format a number as currency with dollar sign
 * @example formatCurrency(1234.56) => "$1,234.56"
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`
}

/**
 * Format a number as a whole currency (no decimals)
 * @example formatCurrencyWhole(1234.56) => "$1,235"
 */
export function formatCurrencyWhole(value: number): string {
  return `$${Math.round(value).toLocaleString()}`
}

/**
 * Format a number as a compact currency (e.g., $1.2k)
 * @example formatCurrencyCompact(1234) => "$1.2k"
 */
export function formatCurrencyCompact(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${value.toLocaleString()}`
}

/**
 * Format a number as a percentage (rounded to whole number)
 * @example formatPercent(75.5) => "76%"
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

/**
 * Format a number as a percentage with decimals
 * @example formatPercentPrecise(75.56, 1) => "75.6%"
 */
export function formatPercentPrecise(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}
