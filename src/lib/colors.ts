/**
 * Centralized color constants
 * Single source of truth for all UI colors
 */

// Semantic status colors
export const STATUS_COLORS = {
  success: '#10B981',  // Green - under budget, positive
  warning: '#F59E0B',  // Amber - on track, neutral
  error: '#FF6B6B',    // Red - over budget, negative
} as const

// Category type colors
export const CATEGORY_COLORS = {
  need: '#10B981',     // Green
  want: '#A855F7',     // Purple
  income: '#10B981',   // Green
  savings: '#38BDF8',  // Sky blue
} as const

// Primary brand colors
export const BRAND_COLORS = {
  primary: '#6366F1',    // Indigo
  secondary: '#1F1410',  // Dark brown
  background: '#FFFBF5', // Warm white
} as const

// Chart colors
export const CHART_COLORS = {
  spent: '#F59E0B',      // Amber
  budget: 'rgba(31, 20, 16, 0.1)',
  income: '#10B981',     // Green
} as const

// Navigation/tab colors
export const TAB_COLORS = {
  dashboard: '#F59E0B',
  transactions: '#8B5CF6',
  income: '#10B981',
  expenses: '#FF6B6B',
  savings: '#38BDF8',
  budget: '#6366F1',
  accounts: '#14B8A6',
  profile: '#A855F7',
} as const

// Account group colors
export const ACCOUNT_GROUP_COLORS = {
  cash: '#10B981',     // Emerald
  credit: '#EF4444',   // Red
  investment: '#6366F1', // Indigo
  loan: '#F59E0B',     // Amber
  retirement: '#A855F7', // Purple
} as const

// Available colors for category/goal creation
export const PALETTE = [
  '#FF6B6B', // Red
  '#A855F7', // Purple
  '#38BDF8', // Sky blue
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#6366F1', // Indigo
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#8B5CF6', // Violet
  '#EF4444', // Red 500
  '#6B7280', // Gray
] as const

// Opacity variants for backgrounds
export const withOpacity = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

// Common text colors with opacity
export const TEXT_COLORS = {
  primary: '#1F1410',
  secondary: 'rgba(31, 20, 16, 0.6)',
  muted: 'rgba(31, 20, 16, 0.5)',
  hint: 'rgba(31, 20, 16, 0.4)',
} as const
