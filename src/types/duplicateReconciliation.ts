import type { Transaction, TransactionSource } from './transaction'

export type DuplicateMatchConfidence = 'exact' | 'fuzzy'

export type DuplicateAction = 'merge' | 'dismiss' | 'skip'

export type ReconciliationStep = 'detecting' | 'review' | 'processing' | 'complete'

export type DuplicatePair = {
  id: string // deterministic: sorted ids joined with '-'
  transactionA: Transaction // higher source priority (kept by default)
  transactionB: Transaction // lower source priority (discarded by default)
  confidence: DuplicateMatchConfidence
  matchReasons: string[]
  merchantSimilarity: number
  dateDiffDays: number
  action: DuplicateAction
  keepTransactionId: string // which tx to keep (defaults to transactionA.id)
}

export type ReconciliationResult = {
  mergedCount: number
  dismissedCount: number
  skippedCount: number
  errors: string[]
}

/** Source priority for deciding which transaction to keep (higher = keep) */
export const SOURCE_PRIORITY: Record<TransactionSource, number> = {
  plaid: 3,
  csv_import: 2,
  manual: 1,
}
