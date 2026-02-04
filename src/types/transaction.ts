/**
 * Transaction type definition
 * Maps to the Supabase transactions table schema
 */

export type TransactionSource = 'plaid' | 'csv_import' | 'manual'

export type PaymentChannel = 'online' | 'in store' | 'other'

export type Transaction = {
  id: string
  user_id?: string
  date: string // ISO date string (YYYY-MM-DD)
  merchant: string
  category: string | null
  category_id: string | null // FK to categories table
  amount: number // Negative for expenses, positive for income
  tags: string | null // Comma-separated (e.g., "groceries,weekly")
  notes: string | null
  plaid_transaction_id: string | null
  plaid_account_id: string | null
  plaid_category: string[] | null // Plaid's hierarchical category
  plaid_category_id: string | null
  pending: boolean
  payment_channel: PaymentChannel | null
  source: TransactionSource
  source_name: string | null
  created_at: string
  updated_at: string
}

/**
 * Input type for creating a new transaction (omits auto-generated fields)
 */
export type TransactionInsert = Omit<Transaction, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

/**
 * Input type for updating a transaction (all fields optional except id)
 */
export type TransactionUpdate = Partial<Omit<Transaction, 'id'>> & {
  id: string
}

/**
 * CSV import row format
 */
export type CSVTransactionRow = {
  date: string
  merchant: string
  category?: string
  category_id?: string
  amount: number | string
  tags?: string
  notes?: string
}

// ============================================
// Helper Functions
// ============================================

/**
 * Parse comma-separated tags string into array
 */
export const parseTags = (tags: string | null): string[] =>
  tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : []

/**
 * Convert tags array to comma-separated string
 */
export const stringifyTags = (tags: string[]): string => tags.join(',')

/**
 * Convert CSV row to transaction insert format
 */
export const csvRowToTransaction = (row: CSVTransactionRow): TransactionInsert => ({
  date: row.date,
  merchant: row.merchant,
  category: row.category || null,
  category_id: row.category_id || null,
  amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
  tags: row.tags || null,
  notes: row.notes || null,
  plaid_transaction_id: null,
  plaid_account_id: null,
  plaid_category: null,
  plaid_category_id: null,
  pending: false,
  payment_channel: null,
  source: 'csv_import',
  source_name: null,
})

/**
 * Convert Plaid transaction to our format
 * Note: Plaid amounts are positive for debits (expenses), we invert for consistency
 */
export const plaidToTransaction = (
  plaidTx: {
    transaction_id: string
    account_id: string
    date: string
    merchant_name?: string | null
    name: string
    amount: number
    category?: string[] | null
    category_id?: string | null
    pending: boolean
    payment_channel?: string
  },
  sourceName?: string
): TransactionInsert => ({
  date: plaidTx.date,
  merchant: plaidTx.merchant_name || plaidTx.name,
  category: plaidTx.category?.[0] || null,
  category_id: null, // Will be resolved after import based on category name
  amount: -plaidTx.amount, // Plaid: positive = debit; we want negative = expense
  tags: null,
  notes: null,
  plaid_transaction_id: plaidTx.transaction_id,
  plaid_account_id: plaidTx.account_id,
  plaid_category: plaidTx.category || null,
  plaid_category_id: plaidTx.category_id || null,
  pending: plaidTx.pending,
  payment_channel: (plaidTx.payment_channel as PaymentChannel) || null,
  source: 'plaid',
  source_name: sourceName || null,
})

/**
 * Check if a transaction is an expense
 */
export const isExpense = (tx: Transaction): boolean => tx.amount < 0

/**
 * Check if a transaction is income
 */
export const isIncome = (tx: Transaction): boolean => tx.amount > 0

/**
 * Get absolute amount (useful for display)
 */
export const getAbsoluteAmount = (tx: Transaction): number => Math.abs(tx.amount)
