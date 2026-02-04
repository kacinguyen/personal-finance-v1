/**
 * Budget type definitions
 * Maps to the Supabase budgets table schema
 */

import type { LucideIcon } from 'lucide-react'
import type { CategoryType } from './category'

/**
 * Database budget type (raw from Supabase)
 */
export type Budget = {
  id: string
  user_id: string
  category: string
  category_id: string | null
  monthly_limit: number
  budget_type: CategoryType
  flexibility: 'fixed' | 'variable'
  icon: string
  color: string
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Database budget with joined category data
 */
export type BudgetWithCategory = Budget & {
  categories: {
    id: string
    parent_id: string | null
    name: string
    icon: string
    color: string
  } | null
}

/**
 * UI budget type for component rendering
 */
export type BudgetUI = {
  id: string
  category_id: string | null
  parent_id: string | null
  name: string
  icon: LucideIcon
  iconName: string
  budget: number
  lastMonthSpent: number
  color: string
  type: CategoryType
}

/**
 * Grouped budget structure for nested display
 */
export type BudgetGroup = {
  parent: BudgetUI
  children: BudgetUI[]
}

/**
 * Input type for creating a new budget
 */
export type BudgetInsert = Omit<Budget, 'id' | 'user_id' | 'created_at' | 'updated_at'> & {
  id?: string
  user_id?: string
}

/**
 * Input type for updating a budget
 */
export type BudgetUpdate = Partial<Omit<Budget, 'id' | 'user_id'>> & {
  id: string
}
