/**
 * Transaction split type definition
 * Maps to the Supabase transaction_splits table schema
 */

export type TransactionSplit = {
  id: string
  transaction_id: string
  amount: number
  category: string | null
  category_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type TransactionSplitInsert = Omit<TransactionSplit, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
}

export type TransactionSplitUpdate = Partial<Omit<TransactionSplit, 'id' | 'transaction_id'>> & {
  id: string
}

/**
 * UI representation of a split for the split editor
 */
export type UISplit = {
  id?: string
  amount: number
  category_id: string | null
  category_name: string | null
  notes: string | null
}
