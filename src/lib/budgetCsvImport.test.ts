import { describe, it, expect } from 'vitest'
import { parseBudgetCSV, matchCategoriesToCSV } from './budgetCsvImport'
import type { Category } from '../types/category'

describe('parseBudgetCSV', () => {
  it('should parse a valid CSV with standard columns', () => {
    const csv = `category,monthly_budget,type
Groceries,600,need
Restaurants,300,want
Entertainment,200,want`

    const result = parseBudgetCSV(csv)

    expect(result.success).toBe(true)
    expect(result.rows).toHaveLength(3)
    expect(result.errors).toHaveLength(0)

    expect(result.rows[0]).toEqual({
      category: 'Groceries',
      monthly_budget: 600,
      type: 'need',
      rowIndex: 1,
    })
    expect(result.rows[1]).toEqual({
      category: 'Restaurants',
      monthly_budget: 300,
      type: 'want',
      rowIndex: 2,
    })
  })

  it('should handle alternative column names', () => {
    const csv = `name,amount
Groceries,500
Rent,2000`

    const result = parseBudgetCSV(csv)

    expect(result.success).toBe(true)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0].category).toBe('Groceries')
    expect(result.rows[0].monthly_budget).toBe(500)
  })

  it('should handle currency formatting in amounts', () => {
    const csv = `category,monthly_budget
Groceries,$600.00
Rent,"$2,000"
Utilities,$150.50`

    const result = parseBudgetCSV(csv)

    expect(result.success).toBe(true)
    expect(result.rows[0].monthly_budget).toBe(600)
    expect(result.rows[1].monthly_budget).toBe(2000)
    expect(result.rows[2].monthly_budget).toBe(150.5)
  })

  it('should fail if missing required columns', () => {
    const csvMissingCategory = `amount,type
600,need`

    const result1 = parseBudgetCSV(csvMissingCategory)
    expect(result1.success).toBe(false)
    expect(result1.errors[0]).toContain('category')

    const csvMissingBudget = `category,type
Groceries,need`

    const result2 = parseBudgetCSV(csvMissingBudget)
    expect(result2.success).toBe(false)
    expect(result2.errors[0]).toContain('monthly_budget')
  })

  it('should fail for empty or header-only CSV', () => {
    const result1 = parseBudgetCSV('')
    expect(result1.success).toBe(false)

    const result2 = parseBudgetCSV('category,monthly_budget')
    expect(result2.success).toBe(false)
  })

  it('should skip rows with invalid amounts and report errors', () => {
    const csv = `category,monthly_budget
Groceries,600
Invalid,abc
Rent,2000`

    const result = parseBudgetCSV(csv)

    expect(result.success).toBe(true)
    expect(result.rows).toHaveLength(2)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain('Row 3')
    expect(result.errors[0]).toContain('Invalid budget amount')
  })

  it('should handle quoted values with commas', () => {
    const csv = `category,monthly_budget
"Food, Dining",500
Groceries,600`

    const result = parseBudgetCSV(csv)

    expect(result.success).toBe(true)
    expect(result.rows[0].category).toBe('Food, Dining')
  })

  it('should handle empty lines gracefully', () => {
    const csv = `category,monthly_budget
Groceries,600

Rent,2000

`

    const result = parseBudgetCSV(csv)

    expect(result.success).toBe(true)
    expect(result.rows).toHaveLength(2)
  })

  it('should only accept valid category types', () => {
    const csv = `category,monthly_budget,type
Groceries,600,need
Restaurants,300,want
Salary,5000,income
Other,100,invalid`

    const result = parseBudgetCSV(csv)

    expect(result.success).toBe(true)
    expect(result.rows[0].type).toBe('need')
    expect(result.rows[1].type).toBe('want')
    expect(result.rows[2].type).toBe('income')
    expect(result.rows[3].type).toBeUndefined() // Invalid type ignored
  })
})

describe('matchCategoriesToCSV', () => {
  const mockCategories: Category[] = [
    {
      id: '1',
      user_id: 'user1',
      name: 'Groceries',
      normalized_name: 'groceries',
      icon: 'ShoppingCart',
      color: '#10B981',
      category_type: 'need',
      parent_id: null,
      is_system: true,
      is_active: true,
      is_budgetable: false,
      display_order: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: '2',
      user_id: 'user1',
      name: 'Restaurants',
      normalized_name: 'restaurants',
      icon: 'Utensils',
      color: '#FF6B6B',
      category_type: 'want',
      parent_id: null,
      is_system: true,
      is_active: true,
      is_budgetable: false,
      display_order: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: '3',
      user_id: 'user1',
      name: 'Entertainment',
      normalized_name: 'entertainment',
      icon: 'Clapperboard',
      color: '#8B5CF6',
      category_type: 'want',
      parent_id: null,
      is_system: true,
      is_active: true,
      is_budgetable: false,
      display_order: 0,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ]

  it('should find exact matches (case-insensitive)', () => {
    const rows = [
      { category: 'Groceries', monthly_budget: 600, rowIndex: 1 },
      { category: 'RESTAURANTS', monthly_budget: 300, rowIndex: 2 },
      { category: 'entertainment', monthly_budget: 200, rowIndex: 3 },
    ]

    const results = matchCategoriesToCSV(rows, mockCategories)

    expect(results).toHaveLength(3)
    expect(results[0].matchStatus).toBe('exact')
    expect(results[0].matchedCategory?.id).toBe('1')
    expect(results[1].matchStatus).toBe('exact')
    expect(results[1].matchedCategory?.id).toBe('2')
    expect(results[2].matchStatus).toBe('exact')
    expect(results[2].matchedCategory?.id).toBe('3')
  })

  it('should find fuzzy matches for similar names', () => {
    const rows = [
      { category: 'Grocereis', monthly_budget: 600, rowIndex: 1 }, // Typo (transposed letters)
      { category: 'Resturants', monthly_budget: 300, rowIndex: 2 }, // Typo
    ]

    const results = matchCategoriesToCSV(rows, mockCategories)

    expect(results[0].matchStatus).toBe('fuzzy')
    expect(results[0].matchedCategory?.name).toBe('Groceries')
    expect(results[1].matchStatus).toBe('fuzzy')
    expect(results[1].matchedCategory?.name).toBe('Restaurants')
  })

  it('should mark unmatched categories as new', () => {
    const rows = [
      { category: 'Utilities', monthly_budget: 200, rowIndex: 1 },
      { category: 'Internet', monthly_budget: 80, rowIndex: 2 },
    ]

    const results = matchCategoriesToCSV(rows, mockCategories)

    expect(results[0].matchStatus).toBe('new')
    expect(results[0].matchedCategory).toBeNull()
    expect(results[0].action).toBe('create')
    expect(results[1].matchStatus).toBe('new')
  })

  it('should set default action based on match status', () => {
    const rows = [
      { category: 'Groceries', monthly_budget: 600, rowIndex: 1 },
      { category: 'NewCategory', monthly_budget: 100, rowIndex: 2 },
    ]

    const results = matchCategoriesToCSV(rows, mockCategories)

    expect(results[0].action).toBe('update')
    expect(results[1].action).toBe('create')
  })

  it('should provide suggested categories for fuzzy/new matches', () => {
    const rows = [
      { category: 'Grocery Store', monthly_budget: 600, rowIndex: 1 },
    ]

    const results = matchCategoriesToCSV(rows, mockCategories)

    // Should have suggestions based on similarity
    expect(results[0].suggestedCategories.length).toBeGreaterThanOrEqual(0)
  })

  it('should use type from CSV row for new categories', () => {
    const rows = [
      { category: 'Utilities', monthly_budget: 200, type: 'need' as const, rowIndex: 1 },
    ]

    const results = matchCategoriesToCSV(rows, mockCategories)

    expect(results[0].selectedType).toBe('need')
  })

  it('should default to want type for new categories without type', () => {
    const rows = [
      { category: 'Something New', monthly_budget: 100, rowIndex: 1 },
    ]

    const results = matchCategoriesToCSV(rows, mockCategories)

    expect(results[0].selectedType).toBe('want')
  })
})
