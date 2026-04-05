import { supabase } from './supabase'
import type { TransactionInsert, CSVTransactionRow } from '../types/transaction'
import type { Category } from '../types/category'

/**
 * Parse CSV text into rows
 * Supports standard CSV format with headers: date, merchant, category, amount, tags, notes
 */
export function parseCSV(text: string): CSVTransactionRow[] {
  const lines = text.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV file must have a header row and at least one data row')
  }

  // Parse header row (case-insensitive)
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

  // Validate required columns
  const requiredColumns = ['date', 'merchant', 'amount']
  for (const col of requiredColumns) {
    if (!headers.includes(col)) {
      throw new Error(`Missing required column: ${col}`)
    }
  }

  const rows: CSVTransactionRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Handle quoted values with commas
    const values = parseCSVLine(line)

    if (values.length !== headers.length) {
      console.warn(`Skipping row ${i + 1}: column count mismatch`)
      continue
    }

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || ''
    })

    // Parse amount (handle currency symbols and negative values)
    let amount = row.amount.replace(/[$,]/g, '')
    const isNegative = amount.startsWith('(') || amount.startsWith('-')
    amount = amount.replace(/[()]/g, '').replace('-', '')
    const parsedAmount = parseFloat(amount) * (isNegative ? -1 : -1) // CSV expenses are negative

    if (isNaN(parsedAmount)) {
      console.warn(`Skipping row ${i + 1}: invalid amount "${row.amount}"`)
      continue
    }

    rows.push({
      date: row.date,
      merchant: row.merchant,
      category: row.category || undefined,
      amount: parsedAmount,
      tags: row.tags || undefined,
      notes: row.notes || undefined,
    })
  }

  return rows
}

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
 * Convert parsed CSV rows to transaction inserts
 */
function csvRowsToTransactions(
  rows: CSVTransactionRow[],
  userId: string,
  categoryMap: Map<string, string>
): TransactionInsert[] {
  return rows.map((row) => {
    const categoryName = row.category || null
    const categoryId = categoryName ? categoryMap.get(categoryName.toLowerCase()) || null : null

    return {
      user_id: userId,
      date: normalizeDate(row.date),
      merchant: row.merchant,
      category: categoryName,
      category_id: categoryId,
      amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
      tags: row.tags || null,
      notes: row.notes || null,
      plaid_transaction_id: null,
      plaid_account_id: null,
      plaid_category: null,
      plaid_category_id: null,
      plaid_counterparty: null,
      plaid_counterparty_confidence: null,
      plaid_merchant_entity_id: null,
      plaid_detailed_category: null,
      plaid_location: null,
      pending: false,
      payment_channel: null,
      source: 'csv_import' as const,
      source_name: null,
      needs_review: true,
      goal_id: null,
    }
  })
}

/**
 * Fetch user's categories and create a lookup map
 */
async function fetchCategoryMap(userId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, normalized_name')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching categories:', error)
    return new Map()
  }

  const map = new Map<string, string>()
  for (const cat of (data as Pick<Category, 'id' | 'normalized_name'>[])) {
    map.set(cat.normalized_name, cat.id)
  }
  return map
}

/**
 * Create categories for unknown category names in CSV
 */
async function createMissingCategories(
  rows: CSVTransactionRow[],
  userId: string,
  existingMap: Map<string, string>
): Promise<Map<string, string>> {
  // Find unique categories not in existing map
  const uniqueCategories = new Set<string>()
  for (const row of rows) {
    if (row.category && !existingMap.has(row.category.toLowerCase())) {
      uniqueCategories.add(row.category)
    }
  }

  if (uniqueCategories.size === 0) {
    return existingMap
  }

  // Create new categories
  const newCategories = Array.from(uniqueCategories).map(name => ({
    user_id: userId,
    name,
    normalized_name: name.toLowerCase(),
    icon: 'CircleDollarSign',
    color: '#6B7280',
    category_type: 'want' as const,
    is_system: false,
    is_active: true,
  }))

  const { data, error } = await supabase
    .from('categories')
    .insert(newCategories)
    .select('id, normalized_name')

  if (error) {
    console.error('Error creating categories:', error)
    return existingMap
  }

  // Merge new categories into map
  const updatedMap = new Map(existingMap)
  for (const cat of (data as Pick<Category, 'id' | 'normalized_name'>[])) {
    updatedMap.set(cat.normalized_name, cat.id)
  }

  return updatedMap
}

/**
 * Normalize various date formats to YYYY-MM-DD
 */
function normalizeDate(dateStr: string): string {
  // Try common formats
  const date = new Date(dateStr)

  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  // Handle MM/DD/YYYY format
  const parts = dateStr.split(/[/-]/)
  if (parts.length === 3) {
    const [a, b, c] = parts.map((p) => parseInt(p, 10))

    // Determine format based on values
    if (a > 12) {
      // DD/MM/YYYY
      return `${c}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`
    } else if (c > 31) {
      // MM/DD/YYYY
      return `${c}-${String(a).padStart(2, '0')}-${String(b).padStart(2, '0')}`
    }
  }

  throw new Error(`Unable to parse date: ${dateStr}`)
}

/**
 * Import CSV file contents to Supabase
 * Returns the number of transactions imported
 */
export async function importCSVToSupabase(file: File, userId: string): Promise<number> {
  const text = await file.text()
  const rows = parseCSV(text)

  if (rows.length === 0) {
    throw new Error('No valid transactions found in CSV')
  }

  // Fetch existing categories
  let categoryMap = await fetchCategoryMap(userId)

  // Create any missing categories from the CSV
  categoryMap = await createMissingCategories(rows, userId, categoryMap)

  // Convert rows to transactions with category_id
  const transactions = csvRowsToTransactions(rows, userId, categoryMap)

  const { data, error } = await supabase
    .from('transactions')
    .insert(transactions)
    .select()

  if (error) {
    throw new Error(`Failed to import: ${error.message}`)
  }

  return data?.length || 0
}

/**
 * Import multiple CSV files
 */
export async function importCSVFiles(files: File[], userId: string): Promise<number> {
  let total = 0

  for (const file of files) {
    const count = await importCSVToSupabase(file, userId)
    total += count
  }

  return total
}
