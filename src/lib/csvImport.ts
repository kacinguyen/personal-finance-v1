import { supabase } from './supabase'
import type { TransactionInsert, CSVTransactionRow } from '../types/transaction'

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
function csvRowsToTransactions(rows: CSVTransactionRow[]): TransactionInsert[] {
  return rows.map((row) => ({
    date: normalizeDate(row.date),
    merchant: row.merchant,
    category: row.category || null,
    amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
    tags: row.tags || null,
    notes: row.notes || null,
    plaid_transaction_id: null,
    plaid_account_id: null,
    plaid_category: null,
    plaid_category_id: null,
    pending: false,
    payment_channel: null,
    source: 'csv_import' as const,
    source_name: null,
  }))
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
export async function importCSVToSupabase(file: File): Promise<number> {
  const text = await file.text()
  const rows = parseCSV(text)

  if (rows.length === 0) {
    throw new Error('No valid transactions found in CSV')
  }

  const transactions = csvRowsToTransactions(rows)

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
export async function importCSVFiles(files: File[]): Promise<number> {
  let total = 0

  for (const file of files) {
    const count = await importCSVToSupabase(file)
    total += count
  }

  return total
}
