/**
 * Duplicate Transaction Detection Library
 *
 * Pure logic (no Supabase) for detecting and resolving duplicate transactions
 * across different sources (Plaid, CSV import, manual entry).
 */

import type { Transaction, TransactionSource } from '../types/transaction'
import type { AccountType } from '../types/account'
import type { DuplicatePair, DuplicateMatchConfidence } from '../types/duplicateReconciliation'
import { SOURCE_PRIORITY } from '../types/duplicateReconciliation'

/** Maps plaid_account_id → account_type for transfer detection */
export type AccountTypeMap = Map<string, AccountType>

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
 * 3. Classify as exact or fuzzy match based on date + merchant similarity
 * 4. Exclude previously dismissed pairs
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
            pairType: 'duplicate',
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

// ───── Transfer Pair Detection ─────

/** Keywords that indicate a credit card payment on the checking side */
const CC_PAYMENT_KEYWORDS = [
  'autopay',
  'credit crd',
  'credit card',
  'card payment',
  'online payment',
  'bill payment',
]

/** Keywords that indicate a payment received on the credit card side */
const CC_RECEIVED_KEYWORDS = [
  'payment thank',
  'payment received',
  'payment - thank',
  'autopay payment',
  'online payment',
]

function hasPaymentKeyword(merchant: string, keywords: string[]): boolean {
  const lower = merchant.toLowerCase()
  return keywords.some(kw => lower.includes(kw))
}

/**
 * Detect credit card payment transfer pairs.
 *
 * A transfer pair is a debit from checking/savings and a credit on a credit card
 * for the same absolute amount within 3 days.
 */
export function detectTransferPairs(
  transactions: Transaction[],
  accountTypeMap: AccountTypeMap,
  dismissedPairIds: Set<string> = new Set()
): DuplicatePair[] {
  // Only consider transactions with a plaid_account_id that we can look up
  const withAccount = transactions.filter(
    tx => tx.plaid_account_id && accountTypeMap.has(tx.plaid_account_id)
  )

  // Partition into debits (amount < 0) and credits (amount > 0)
  const debits = withAccount.filter(tx => tx.amount < 0)
  const credits = withAccount.filter(tx => tx.amount > 0)

  // Group each by absolute amount in integer cents
  const debitsByAmount = new Map<number, Transaction[]>()
  for (const tx of debits) {
    const key = Math.round(Math.abs(tx.amount) * 100)
    const group = debitsByAmount.get(key) || []
    group.push(tx)
    debitsByAmount.set(key, group)
  }

  const creditsByAmount = new Map<number, Transaction[]>()
  for (const tx of credits) {
    const key = Math.round(tx.amount * 100)
    const group = creditsByAmount.get(key) || []
    group.push(tx)
    creditsByAmount.set(key, group)
  }

  const pairs: DuplicatePair[] = []
  const claimed = new Set<string>()

  // Collect candidate pairs sorted by date proximity
  type Candidate = {
    checking: Transaction
    cc: Transaction
    daysDiff: number
    matchReasons: string[]
  }
  const candidates: Candidate[] = []

  for (const [amountCents, debitGroup] of debitsByAmount) {
    const creditGroup = creditsByAmount.get(amountCents)
    if (!creditGroup) continue

    for (const debit of debitGroup) {
      const debitType = accountTypeMap.get(debit.plaid_account_id!)!
      for (const credit of creditGroup) {
        const creditType = accountTypeMap.get(credit.plaid_account_id!)!

        // Must be different accounts
        if (debit.plaid_account_id === credit.plaid_account_id) continue

        // One from checking/savings, other from credit_card
        const isDebitBank = debitType === 'checking' || debitType === 'savings'
        const isCreditCC = creditType === 'credit_card'
        const isDebitCC = debitType === 'credit_card'
        const isCreditBank = creditType === 'checking' || creditType === 'savings'

        let checkingSide: Transaction
        let ccSide: Transaction

        if (isDebitBank && isCreditCC) {
          checkingSide = debit
          ccSide = credit
        } else if (isDebitCC && isCreditBank) {
          checkingSide = credit
          ccSide = debit
        } else {
          continue
        }

        const daysDiff = dateDiffDays(checkingSide.date, ccSide.date)
        if (daysDiff > 3) continue

        const pairId = makePairId(checkingSide.id, ccSide.id)
        if (dismissedPairIds.has(pairId)) continue

        const matchReasons: string[] = []
        matchReasons.push('Same amount (opposite signs)')
        if (daysDiff === 0) {
          matchReasons.push('Same date')
        } else {
          matchReasons.push(`${daysDiff} day${daysDiff > 1 ? 's' : ''} apart`)
        }
        matchReasons.push('Cross-account (bank ↔ credit card)')

        if (hasPaymentKeyword(checkingSide.merchant, CC_PAYMENT_KEYWORDS)) {
          matchReasons.push('Payment keyword in bank transaction')
        }
        if (hasPaymentKeyword(ccSide.merchant, CC_RECEIVED_KEYWORDS)) {
          matchReasons.push('Payment keyword in CC transaction')
        }

        candidates.push({ checking: checkingSide, cc: ccSide, daysDiff, matchReasons })
      }
    }
  }

  // Sort by date proximity (prefer closest dates)
  candidates.sort((a, b) => a.daysDiff - b.daysDiff)

  // Each transaction participates in at most one pair
  for (const c of candidates) {
    if (claimed.has(c.checking.id) || claimed.has(c.cc.id)) continue

    claimed.add(c.checking.id)
    claimed.add(c.cc.id)

    const pairId = makePairId(c.checking.id, c.cc.id)

    pairs.push({
      id: pairId,
      transactionA: c.checking, // bank side = keep
      transactionB: c.cc,       // CC side = remove
      confidence: 'transfer',
      matchReasons: c.matchReasons,
      merchantSimilarity: 0,
      dateDiffDays: c.daysDiff,
      action: 'merge',
      keepTransactionId: c.checking.id,
      pairType: 'transfer',
    })
  }

  // Sort by date diff ascending
  pairs.sort((a, b) => a.dateDiffDays - b.dateDiffDays)

  return pairs
}

/**
 * Compute merged fields for a transfer pair.
 * Forces category to "Credit Card Payment" and adopts tags/notes from CC side
 * if the bank side lacks them.
 */
export function computeTransferMergedFields(
  keep: Transaction,
  discard: Transaction,
  transferCategoryId: string,
  transferCategoryName: string
): Partial<Transaction> {
  const updates: Partial<Transaction> = {
    category_id: transferCategoryId,
    category: transferCategoryName,
  }

  if (!keep.tags && discard.tags) {
    updates.tags = discard.tags
  }

  if (!keep.notes && discard.notes) {
    updates.notes = discard.notes
  }

  return updates
}
