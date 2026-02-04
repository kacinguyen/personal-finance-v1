/**
 * Centralized style constants
 * Common shadows, borders, and style objects
 */

// Box shadows
export const SHADOWS = {
  card: '0 2px 12px rgba(31, 20, 16, 0.06)',
  cardHover: '0 4px 16px rgba(31, 20, 16, 0.08)',
  dropdown: '0 4px 24px rgba(31, 20, 16, 0.12)',
  sidebar: '2px 0 12px rgba(31, 20, 16, 0.04)',
  modal: '0 8px 32px rgba(31, 20, 16, 0.16)',
} as const

// Common border radius values
export const RADIUS = {
  sm: '0.5rem',   // 8px
  md: '0.75rem',  // 12px
  lg: '1rem',     // 16px
  xl: '1.25rem',  // 20px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const

// Card style object for inline styles
export const cardStyle = {
  boxShadow: SHADOWS.card,
} as const

// Common class patterns
export const CARD_CLASSES = 'bg-white rounded-2xl p-6 shadow-sm'
export const BUTTON_CLASSES = 'rounded-xl transition-colors'
export const INPUT_CLASSES = 'rounded-lg border border-[#1F1410]/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20'
