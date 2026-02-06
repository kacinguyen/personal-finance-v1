/**
 * PlaidItem types matching the plaid_items database table.
 */

export type PlaidItemStatus = 'active' | 'error' | 'revoked'

export type PlaidItem = {
  id: string
  user_id: string
  plaid_item_id: string
  plaid_access_token: string | null
  institution_name: string | null
  institution_id: string | null
  status: PlaidItemStatus
  transaction_sync_cursor: string | null
  created_at: string
  updated_at: string
}

/** Safe subset excluding sensitive fields — used on the frontend. */
export type PlaidItemPublic = Omit<PlaidItem, 'plaid_access_token' | 'transaction_sync_cursor'>
