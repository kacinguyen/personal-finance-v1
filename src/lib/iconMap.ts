/**
 * Centralized icon mapping for category icons
 * Single source of truth for converting icon name strings to Lucide components
 */

import {
  LucideIcon,
  Home,
  ShoppingCart,
  Utensils,
  UtensilsCrossed,
  Car,
  Plane,
  ShoppingBag,
  Dumbbell,
  Scissors,
  Clapperboard,
  CreditCard,
  Receipt,
  Heart,
  CircleDollarSign,
  Gift,
  Coffee,
  Gamepad2,
  Music,
  Book,
  Pill,
  Zap,
  Shield,
  Shirt,
  Sparkles,
  Wallet,
  Briefcase,
  ArrowLeftRight,
  PiggyBank,
  Plus,
  Key,
  Wifi,
  Navigation,
  Train,
  ParkingCircle,
  Store,
  Users,
  MoreHorizontal,
  TrendingUp,
  Percent,
  Building2,
} from 'lucide-react'

/**
 * Map of icon name strings to Lucide icon components
 */
export const iconMap: Record<string, LucideIcon> = {
  Home,
  ShoppingCart,
  Utensils,
  UtensilsCrossed,
  Car,
  Plane,
  ShoppingBag,
  Dumbbell,
  Scissors,
  Clapperboard,
  CreditCard,
  Receipt,
  Heart,
  CircleDollarSign,
  Gift,
  Coffee,
  Gamepad2,
  Music,
  Book,
  Pill,
  Zap,
  Shield,
  Shirt,
  Sparkles,
  Wallet,
  Briefcase,
  ArrowLeftRight,
  PiggyBank,
  Plus,
  Key,
  Wifi,
  Navigation,
  Train,
  ParkingCircle,
  Store,
  Users,
  MoreHorizontal,
  TrendingUp,
  Percent,
  Building2,
}

/**
 * Get icon component from icon name string
 * Returns CircleDollarSign as fallback if icon not found
 */
export function getIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return CircleDollarSign
  return iconMap[iconName] || CircleDollarSign
}

/**
 * List of available icons for category creation UI
 */
export const availableIcons: { icon: LucideIcon; name: string }[] = [
  { icon: Utensils, name: 'Utensils' },
  { icon: ShoppingBag, name: 'ShoppingBag' },
  { icon: Car, name: 'Car' },
  { icon: Clapperboard, name: 'Clapperboard' },
  { icon: Receipt, name: 'Receipt' },
  { icon: Heart, name: 'Heart' },
  { icon: Home, name: 'Home' },
  { icon: Plane, name: 'Plane' },
  { icon: Gift, name: 'Gift' },
  { icon: Coffee, name: 'Coffee' },
  { icon: Gamepad2, name: 'Gamepad2' },
  { icon: Music, name: 'Music' },
  { icon: Book, name: 'Book' },
  { icon: Dumbbell, name: 'Dumbbell' },
  { icon: Pill, name: 'Pill' },
  { icon: ShoppingCart, name: 'ShoppingCart' },
  { icon: Scissors, name: 'Scissors' },
  { icon: CreditCard, name: 'CreditCard' },
  { icon: Zap, name: 'Zap' },
  { icon: Shield, name: 'Shield' },
  { icon: Shirt, name: 'Shirt' },
  { icon: Wallet, name: 'Wallet' },
  { icon: Briefcase, name: 'Briefcase' },
  { icon: PiggyBank, name: 'PiggyBank' },
  { icon: TrendingUp, name: 'TrendingUp' },
  { icon: Percent, name: 'Percent' },
  { icon: Building2, name: 'Building2' },
]

/**
 * List of available colors for category creation UI
 */
export const availableColors = [
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
]

/**
 * Default icon for uncategorized items
 */
export const DEFAULT_ICON = CircleDollarSign

/**
 * Default color for uncategorized items
 */
export const DEFAULT_COLOR = '#6B7280'
