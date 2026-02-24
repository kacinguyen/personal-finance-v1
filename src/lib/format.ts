/**
 * Formatting utilities for currency, numbers, and percentages
 * Single source of truth for all display formatting
 */

/**
 * Format a number as currency with dollar sign
 * @example formatCurrency(1234.56) => "$1,234.56"
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`
}
