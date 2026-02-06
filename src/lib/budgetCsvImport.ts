/**
 * Budget CSV Import Library
 *
 * Handles parsing CSV files with budget data, matching categories,
 * and executing bulk budget updates/creates.
 */

import { supabase } from './supabase'
import type { Category, CategoryType } from '../types/category'
import type {
  CSVBudgetRow,
  CSVParseResult,
  BudgetMatchResult,
  BudgetImportResult,
} from '../types/budgetImport'

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.trim())

  return values
}

/**
 * Parse CSV text into budget rows
 *
 * Expected CSV format:
 * category,monthly_budget,type (optional)
 * Groceries,600,need
 * Restaurants,300,want
 */
export function parseBudgetCSV(text: string): CSVParseResult {
  const lines = text.trim().split('\n')
  const errors: string[] = []
  const rows: CSVBudgetRow[] = []

  if (lines.length < 2) {
    return {
      success: false,
      rows: [],
      errors: ['CSV file must have a header row and at least one data row'],
    }
  }

  // Parse header row (case-insensitive)
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

  // Find required columns
  const categoryIndex = headers.findIndex((h) =>
    ['category', 'name', 'category_name'].includes(h)
  )
  const budgetIndex = headers.findIndex((h) =>
    ['monthly_budget', 'budget', 'amount', 'monthly_limit'].includes(h)
  )
  const typeIndex = headers.findIndex((h) =>
    ['type', 'category_type', 'budget_type'].includes(h)
  )

  if (categoryIndex === -1) {
    return {
      success: false,
      rows: [],
      errors: ['Missing required column: category (or name, category_name)'],
    }
  }

  if (budgetIndex === -1) {
    return {
      success: false,
      rows: [],
      errors: ['Missing required column: monthly_budget (or budget, amount, monthly_limit)'],
    }
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)

    // Validate column count
    if (values.length < Math.max(categoryIndex, budgetIndex) + 1) {
      errors.push(`Row ${i + 1}: Not enough columns`)
      continue
    }

    const category = values[categoryIndex]?.trim()
    if (!category) {
      errors.push(`Row ${i + 1}: Missing category name`)
      continue
    }

    // Parse budget amount (handle currency symbols and formatting)
    let budgetStr = values[budgetIndex]?.replace(/[$,]/g, '').trim() || '0'
    const isNegative = budgetStr.startsWith('-') || budgetStr.startsWith('(')
    budgetStr = budgetStr.replace(/[()]/g, '').replace('-', '')
    const budget = parseFloat(budgetStr)

    if (isNaN(budget)) {
      errors.push(`Row ${i + 1}: Invalid budget amount "${values[budgetIndex]}"`)
      continue
    }

    // Parse type if present
    let type: CategoryType | undefined
    if (typeIndex !== -1 && values[typeIndex]) {
      const typeValue = values[typeIndex].toLowerCase().trim()
      if (['need', 'want', 'income', 'transfer'].includes(typeValue)) {
        type = typeValue as CategoryType
      }
    }

    rows.push({
      category,
      monthly_budget: isNegative ? -budget : budget,
      type,
      rowIndex: i,
    })
  }

  return {
    success: rows.length > 0,
    rows,
    errors,
  }
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching category names
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function similarityScore(a: string, b: string): number {
  const aLower = a.toLowerCase()
  const bLower = b.toLowerCase()

  if (aLower === bLower) return 1

  const distance = levenshteinDistance(aLower, bLower)
  const maxLen = Math.max(aLower.length, bLower.length)

  return maxLen > 0 ? 1 - distance / maxLen : 0
}

/**
 * Match CSV rows to existing categories using tiered strategy:
 * 1. Exact match (case-insensitive)
 * 2. Fuzzy match (similarity > 0.7)
 * 3. Create new
 * 4. Skip
 */
export function matchCategoriesToCSV(
  rows: CSVBudgetRow[],
  categories: Category[]
): BudgetMatchResult[] {
  const results: BudgetMatchResult[] = []

  for (const row of rows) {
    const normalizedName = row.category.toLowerCase()

    // 1. Try exact match (case-insensitive)
    const exactMatch = categories.find(
      (c) => c.normalized_name === normalizedName || c.name.toLowerCase() === normalizedName
    )

    if (exactMatch) {
      results.push({
        csvRow: row,
        matchStatus: 'exact',
        matchedCategory: exactMatch,
        suggestedCategories: [],
        action: 'update',
      })
      continue
    }

    // 2. Try fuzzy match
    const scored = categories
      .map((c) => ({
        category: c,
        score: similarityScore(row.category, c.name),
      }))
      .filter((s) => s.score > 0.6)
      .sort((a, b) => b.score - a.score)

    if (scored.length > 0 && scored[0].score > 0.7) {
      results.push({
        csvRow: row,
        matchStatus: 'fuzzy',
        matchedCategory: scored[0].category,
        suggestedCategories: scored.slice(0, 3).map((s) => s.category),
        action: 'update',
        selectedCategory: scored[0].category,
      })
      continue
    }

    // 3. No match - suggest creating new or skipping
    results.push({
      csvRow: row,
      matchStatus: 'new',
      matchedCategory: null,
      suggestedCategories: scored.slice(0, 3).map((s) => s.category),
      action: 'create',
      selectedType: row.type || 'want',
    })
  }

  return results
}

/**
 * Execute budget import based on match results
 */
export async function executeBudgetImport(
  matches: BudgetMatchResult[],
  userId: string
): Promise<BudgetImportResult> {
  const errors: string[] = []
  let updatedCount = 0
  let createdCount = 0
  let skippedCount = 0

  for (const match of matches) {
    if (match.action === 'skip') {
      skippedCount++
      continue
    }

    if (match.action === 'update') {
      // Update existing budget
      const categoryToUse = match.selectedCategory || match.matchedCategory
      if (!categoryToUse) {
        errors.push(`Row ${match.csvRow.rowIndex + 1}: No category selected for update`)
        skippedCount++
        continue
      }

      // Check if budget exists for this category
      const { data: existingBudget } = await supabase
        .from('budgets')
        .select('id')
        .eq('category_id', categoryToUse.id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (existingBudget) {
        // Update existing budget
        const { error: updateError } = await supabase
          .from('budgets')
          .update({ monthly_limit: match.csvRow.monthly_budget })
          .eq('id', existingBudget.id)

        if (updateError) {
          errors.push(`Row ${match.csvRow.rowIndex + 1}: Failed to update budget - ${updateError.message}`)
        } else {
          updatedCount++
        }
      } else {
        // Create budget for existing category
        const { error: insertError } = await supabase.from('budgets').insert({
          user_id: userId,
          category: categoryToUse.name,
          category_id: categoryToUse.id,
          monthly_limit: match.csvRow.monthly_budget,
          budget_type: categoryToUse.category_type,
          flexibility: 'variable',
          icon: categoryToUse.icon,
          color: categoryToUse.color,
          is_active: true,
        })

        if (insertError) {
          errors.push(`Row ${match.csvRow.rowIndex + 1}: Failed to create budget - ${insertError.message}`)
        } else {
          createdCount++
        }
      }
    } else if (match.action === 'create') {
      // Create new category and budget
      const categoryType = match.selectedType || match.csvRow.type || 'want'

      // Create category first
      const { data: newCategory, error: catError } = await supabase
        .from('categories')
        .insert({
          user_id: userId,
          name: match.csvRow.category,
          normalized_name: match.csvRow.category.toLowerCase(),
          icon: 'CircleDollarSign',
          color: categoryType === 'need' ? '#10B981' : '#A855F7',
          category_type: categoryType,
          is_system: false,
          is_active: true,
        })
        .select()
        .single()

      if (catError) {
        errors.push(`Row ${match.csvRow.rowIndex + 1}: Failed to create category - ${catError.message}`)
        continue
      }

      // Create budget for new category
      const { error: budgetError } = await supabase.from('budgets').insert({
        user_id: userId,
        category: match.csvRow.category,
        category_id: newCategory.id,
        monthly_limit: match.csvRow.monthly_budget,
        budget_type: categoryType,
        flexibility: 'variable',
        icon: 'CircleDollarSign',
        color: categoryType === 'need' ? '#10B981' : '#A855F7',
        is_active: true,
      })

      if (budgetError) {
        errors.push(`Row ${match.csvRow.rowIndex + 1}: Category created but budget failed - ${budgetError.message}`)
      } else {
        createdCount++
      }
    }
  }

  return {
    success: errors.length === 0,
    updatedCount,
    createdCount,
    skippedCount,
    errors,
  }
}
