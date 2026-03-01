import type { PendingReimbursement } from '../types/pendingReimbursement'

type MatchableTransaction = {
  id: string
  merchant: string
  amount: number
  date: string
  source: string
  category: string | null
}

export type MatchConfidence = 'high' | 'medium' | 'low'

export type MatchSuggestion = {
  transaction: MatchableTransaction
  reimbursement: PendingReimbursement
  confidence: MatchConfidence
  reason: string
}

const PAYMENT_APP_KEYWORDS = ['venmo', 'zelle', 'cash app', 'cashapp', 'paypal']
const MAX_DAYS_APART = 60

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00')
  const b = new Date(dateB + 'T00:00:00')
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)
}

function isPaymentAppSource(tx: MatchableTransaction): boolean {
  const source = (tx.source || '').toLowerCase()
  const merchant = (tx.merchant || '').toLowerCase()
  return PAYMENT_APP_KEYWORDS.some(
    keyword => source.includes(keyword) || merchant.includes(keyword)
  )
}

function isReimbursementCategory(tx: MatchableTransaction): boolean {
  const cat = (tx.category || '').toLowerCase()
  return cat === 'reimbursements' || cat === 'pending reimbursement'
}

/**
 * Find incoming transactions that may be reimbursements for pending splits.
 * Returns matches sorted by confidence (high first).
 */
export function findReimbursementMatches(
  pendingReimbursements: PendingReimbursement[],
  incomingTransactions: MatchableTransaction[],
): MatchSuggestion[] {
  const suggestions: MatchSuggestion[] = []

  // Only consider positive-amount (incoming) transactions
  const incoming = incomingTransactions.filter(tx => tx.amount > 0)

  for (const reimbursement of pendingReimbursements) {
    if (reimbursement.status !== 'pending') continue

    // Get the original transaction date for proximity check
    // We use created_at as a fallback since we don't have the tx date directly
    const reimbursementDate = reimbursement.created_at.split('T')[0]

    for (const tx of incoming) {
      // Must be within time window
      if (daysBetween(tx.date, reimbursementDate) > MAX_DAYS_APART) continue

      const amountDiff = Math.abs(tx.amount - reimbursement.others_share)
      const percentDiff = reimbursement.others_share > 0
        ? (amountDiff / reimbursement.others_share) * 100
        : 100

      // Skip if amount is way off (more than 20% difference)
      if (percentDiff > 20) continue

      const isFromPaymentApp = isPaymentAppSource(tx)
      const isReimbCategory = isReimbursementCategory(tx)

      let confidence: MatchConfidence
      let reason: string

      if (amountDiff < 0.01) {
        // Exact match
        confidence = 'high'
        reason = `Exact amount match ($${reimbursement.others_share.toFixed(2)})`
        if (isFromPaymentApp) reason += ' from payment app'
      } else if (percentDiff <= 5 && (isFromPaymentApp || isReimbCategory)) {
        confidence = 'high'
        reason = `Close amount ($${tx.amount.toFixed(2)}) from payment app`
      } else if (percentDiff <= 10) {
        confidence = 'medium'
        reason = `Similar amount ($${tx.amount.toFixed(2)} vs $${reimbursement.others_share.toFixed(2)})`
      } else {
        confidence = 'low'
        reason = `Approximate amount ($${tx.amount.toFixed(2)} vs $${reimbursement.others_share.toFixed(2)})`
      }

      suggestions.push({ transaction: tx, reimbursement, confidence, reason })
    }
  }

  // Sort: high > medium > low, then by date (most recent first)
  const order: Record<MatchConfidence, number> = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => {
    const confDiff = order[a.confidence] - order[b.confidence]
    if (confDiff !== 0) return confDiff
    return b.transaction.date.localeCompare(a.transaction.date)
  })

  return suggestions
}
