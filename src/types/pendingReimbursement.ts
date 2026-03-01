/**
 * Pending reimbursement type definitions
 * Maps to the Supabase pending_reimbursements table schema
 */

export type ReimbursementStatus = 'pending' | 'resolved' | 'written_off'

export type PendingReimbursement = {
  id: string
  user_id: string
  transaction_id: string
  original_amount: number   // Full amount before split (negative for expenses)
  user_share: number        // User's portion (negative for expenses)
  others_share: number      // Absolute value owed back (positive)
  split_percentage: number | null
  status: ReimbursementStatus
  resolved_transaction_id: string | null
  resolved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PendingReimbursementInsert = Omit<
  PendingReimbursement,
  'id' | 'created_at' | 'updated_at' | 'resolved_at'
> & {
  id?: string
  resolved_at?: string | null
}
