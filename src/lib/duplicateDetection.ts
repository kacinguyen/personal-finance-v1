/**
 * Duplicate Transaction Detection Library
 *
 * Pure logic (no Supabase) for detecting and resolving duplicate transactions
 * across different sources (Plaid, CSV import, manual entry).
 */

import type { Transaction, TransactionSource } from '../types/transaction'
import type { DuplicatePair, DuplicateMatchConfidence } from '../types/duplicateReconciliation'
import { SOURCE_PRIORITY } from '../types/duplicateReconciliation'

// Payment prefixes commonly prepended by processors
const PAYMENT_PREFIXES = [
  'sq *',
  'tst*',
  'tst *',
  'amzn mktp us*',
  'amzn mktp us *',
  'amazon.com*',
  'paypal *',
  'paypal*',
  'google *',
  'apple.com/',
  'sp *',
  'sp*',
  'ck *',
  'pos ',
  'pos debit ',
  'checkcard ',
  'chk ',
]

/**
 * Normalize a merchant name for comparison.
 * - Lowercase
 * - Strip common payment processor prefixes
 * - Strip trailing store numbers (#12345)
 * - Trim whitespace
 */
export function normalizeMerchant(merchant: string): string {
  let normalized = merchant.toLowerCase().trim()

  // Strip payment prefixes
  for (const prefix of PAYMENT_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length).trim()
      break
    }
  }

  // Strip trailing store numbers/IDs like #12345 or #ABC123
  normalized = normalized.replace(/\s*#\w+\s*$/, '').trim()

  return normalized
}

/**
 * Levenshtein distance between two strings
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
 * Calculate similarity score between two merchant names (0-1).
 * Uses normalized merchant names and Levenshtein distance.
 */
export function merchantSimilarity(a: string, b: string): number {
  const aNorm = normalizeMerchant(a)
  const bNorm = normalizeMerchant(b)

  if (aNorm === bNorm) return 1

  const distance = levenshteinDistance(aNorm, bNorm)
  const maxLen = Math.max(aNorm.length, bNorm.length)

  return maxLen > 0 ? 1 - distance / maxLen : 0
}

/**
 * Get the number of days between two date strings (YYYY-MM-DD)
 */
function dateDiffDays(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00')
  const b = new Date(dateB + 'T00:00:00')
  return Math.abs(Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)))
}

/**
 * Create a deterministic pair ID from two transaction IDs
 */
function makePairId(idA: string, idB: string): string {
  return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`
}

/**
 * Order a pair so transactionA has higher source priority.
 * If equal priority, keep the older transaction as A.
 */
function orderBySourcePriority(
  txA: Transaction,
  txB: Transaction
): [Transaction, Transaction] {
  const priorityA = SOURCE_PRIORITY[txA.source as TransactionSource] ?? 0
  const priorityB = SOURCE_PRIORITY[txB.source as TransactionSource] ?? 0

  if (priorityA > priorityB) return [txA, txB]
  if (priorityB > priorityA) return [txB, txA]
  // Same priority: keep the older one (earlier created_at)
  return txA.created_at <= txB.created_at ? [txA, txB] : [txB, txA]
}

/**
 * Detect duplicate transaction pairs.
 *
 * Algorithm:
 * 1. Group transactions by amount in integer cents
 * 2. Within each group, compare all pairs
 * 3. Skip Plaid↔Plaid pairs (handled by DB unique constraint)
 * 4. Classify as exact or fuzzy match based on date + merchant similarity
 * 5. Exclude previously dismissed pairs
 */
export function detectDuplicates(
  transactions: Transaction[],
  dismissedPairIds: Set<string> = new Set()
): DuplicatePair[] {
  // Group by amount in integer cents
  const byAmount = new Map<number, Transaction[]>()
  for (const tx of transactions) {
    const key = Math.round(Math.abs(tx.amount) * 100)
    const group = byAmount.get(key) || []
    group.push(tx)
    byAmount.set(key, group)
  }

  const pairs: DuplicatePair[] = []

  for (const group of byAmount.values()) {
    if (group.length < 2) continue

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const txA = group[i]
        const txB = group[j]

        // Skip Plaid↔Plaid — already deduplicated by plaid_transaction_id
        if (txA.source === 'plaid' && txB.source === 'plaid') continue

        const pairId = makePairId(txA.id, txB.id)

        // Skip dismissed pairs
        if (dismissedPairIds.has(pairId)) continue

        const similarity = merchantSimilarity(txA.merchant, txB.merchant)
        const daysDiff = dateDiffDays(txA.date, txB.date)

        let confidence: DuplicateMatchConfidence | null = null
        const matchReasons: string[] = []

        // Exact match: same date + merchant similarity >= 0.85
        if (daysDiff === 0 && similarity >= 0.85) {
          confidence = 'exact'
          matchReasons.push('Same date')
          matchReasons.push(`Merchant match ${Math.round(similarity * 100)}%`)
        }
        // Fuzzy match: date within 2 days + merchant similarity >= 0.70
        else if (daysDiff <= 2 && similarity >= 0.70) {
          confidence = 'fuzzy'
          if (daysDiff === 0) {
            matchReasons.push('Same date')
          } else {
            matchReasons.push(`${daysDiff} day${daysDiff > 1 ? 's' : ''} apart`)
          }
          matchReasons.push(`Merchant match ${Math.round(similarity * 100)}%`)
        }

        if (confidence) {
          const [primary, secondary] = orderBySourcePriority(txA, txB)

          pairs.push({
            id: pairId,
            transactionA: primary,
            transactionB: secondary,
            confidence,
            matchReasons,
            merchantSimilarity: similarity,
            dateDiffDays: daysDiff,
            action: 'merge',
            keepTransactionId: primary.id,
          })
        }
      }
    }
  }

  // Sort: exact matches first, then by merchant similarity descending
  pairs.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return a.confidence === 'exact' ? -1 : 1
    }
    return b.merchantSimilarity - a.merchantSimilarity
  })

  return pairs
}

/**
 * Compute merged fields: adopt tags/notes/category from discarded tx
 * if the kept tx lacks them.
 */
export function computeMergedFields(
  keep: Transaction,
  discard: Transaction
): Partial<Transaction> {
  const updates: Partial<Transaction> = {}

  if (!keep.tags && discard.tags) {
    updates.tags = discard.tags
  }

  if (!keep.notes && discard.notes) {
    updates.notes = discard.notes
  }

  if (!keep.category_id && discard.category_id) {
    updates.category_id = discard.category_id
    updates.category = discard.category
  }

  return updates
}
