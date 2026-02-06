/**
 * Budget CSV Import type definitions
 * Used for bulk importing budget amounts from CSV files
 */

import type { Category, CategoryType } from './category'

export type MatchStatus = 'exact' | 'fuzzy' | 'new' | 'skip'

/**
 * Parsed row from a budget CSV file
 */
export interface CSVBudgetRow {
  category: string
  monthly_budget: number
  type?: CategoryType
  /** Original row index for error reporting */
  rowIndex: number
}

/**
 * Result of matching a CSV row to existing categories
 */
export interface BudgetMatchResult {
  csvRow: CSVBudgetRow
  matchStatus: MatchStatus
  /** The matched category (for exact/fuzzy matches) */
  matchedCategory: Category | null
  /** Suggested categories for fuzzy matches */
  suggestedCategories: Category[]
  /** User's chosen action */
  action: 'update' | 'create' | 'skip'
  /** User's selected category (if manually changed) */
  selectedCategory?: Category
  /** User's selected type for new categories */
  selectedType?: CategoryType
}

/**
 * Result of executing a budget import
 */
export interface BudgetImportResult {
  success: boolean
  updatedCount: number
  createdCount: number
  skippedCount: number
  errors: string[]
}

/**
 * Parse result from CSV
 */
export interface CSVParseResult {
  success: boolean
  rows: CSVBudgetRow[]
  errors: string[]
}
