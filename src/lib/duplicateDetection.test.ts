import { describe, it, expect } from 'vitest'
import {
  normalizeMerchant,
  merchantSimilarity,
  detectDuplicates,
  computeMergedFields,
} from './duplicateDetection'
import type { Transaction } from '../types/transaction'

/** Helper to build a minimal Transaction for testing */
function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    date: '2024-03-15',
    merchant: 'Test Merchant',
    category: null,
    category_id: null,
    amount: -25.50,
    tags: null,
    notes: null,
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
    source: 'manual',
    source_name: null,
    created_at: '2024-03-15T12:00:00Z',
    updated_at: '2024-03-15T12:00:00Z',
    needs_review: false,
    goal_id: null,
    goal_contribution_amount: null,
    ...overrides,
  }
}

// ───── normalizeMerchant ─────

describe('normalizeMerchant', () => {
  it('lowercases and trims', () => {
    expect(normalizeMerchant('  Starbucks  ')).toBe('starbucks')
  })

  it('strips SQ * prefix', () => {
    expect(normalizeMerchant('SQ *Starbucks')).toBe('starbucks')
  })

  it('strips TST* prefix', () => {
    expect(normalizeMerchant('TST*Chipotle')).toBe('chipotle')
  })

  it('strips PAYPAL * prefix', () => {
    expect(normalizeMerchant('PAYPAL *SPOTIFY')).toBe('spotify')
  })

  it('strips AMZN Mktp US* prefix', () => {
    expect(normalizeMerchant('AMZN Mktp US*Amazon Purchase')).toBe('amazon purchase')
  })

  it('strips trailing store numbers', () => {
    expect(normalizeMerchant('Walmart #1234')).toBe('walmart')
  })

  it('strips trailing alphanumeric IDs', () => {
    expect(normalizeMerchant('Target #T0981')).toBe('target')
  })

  it('handles merchant with no prefix or suffix', () => {
    expect(normalizeMerchant('Costco Wholesale')).toBe('costco wholesale')
  })
})

// ───── merchantSimilarity ─────

describe('merchantSimilarity', () => {
  it('returns 1 for identical merchants', () => {
    expect(merchantSimilarity('Starbucks', 'Starbucks')).toBe(1)
  })

  it('returns 1 for same merchant with different prefixes', () => {
    expect(merchantSimilarity('SQ *Starbucks', 'Starbucks')).toBe(1)
  })

  it('returns high score for similar merchants', () => {
    const score = merchantSimilarity('Starbucks Coffee', 'Starbucks Coffe')
    expect(score).toBeGreaterThan(0.9)
  })

  it('returns low score for different merchants', () => {
    const score = merchantSimilarity('Starbucks', 'Target')
    expect(score).toBeLessThan(0.5)
  })
})

// ───── detectDuplicates ─────

describe('detectDuplicates', () => {
  it('detects exact match (same date, same merchant, same amount)', () => {
    const plaidTx = makeTx({ source: 'plaid', merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })
    const manualTx = makeTx({ source: 'manual', merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })

    const pairs = detectDuplicates([plaidTx, manualTx])

    expect(pairs).toHaveLength(1)
    expect(pairs[0].confidence).toBe('exact')
    expect(pairs[0].transactionA.id).toBe(plaidTx.id) // plaid has higher priority
    expect(pairs[0].transactionB.id).toBe(manualTx.id)
  })

  it('detects fuzzy match (date ±2 days, similar merchant)', () => {
    const csvTx = makeTx({ source: 'csv_import', merchant: 'Chipotle Grill', amount: -12.50, date: '2024-03-15' })
    const manualTx = makeTx({ source: 'manual', merchant: 'Chipotle Gril', amount: -12.50, date: '2024-03-17' })

    const pairs = detectDuplicates([csvTx, manualTx])

    expect(pairs).toHaveLength(1)
    expect(pairs[0].confidence).toBe('fuzzy')
    expect(pairs[0].dateDiffDays).toBe(2)
  })

  it('does not match transactions with different amounts', () => {
    const txA = makeTx({ merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })
    const txB = makeTx({ merchant: 'Starbucks', amount: -5.50, date: '2024-03-15' })

    const pairs = detectDuplicates([txA, txB])
    expect(pairs).toHaveLength(0)
  })

  it('does not match transactions with dates more than 2 days apart', () => {
    const txA = makeTx({ merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })
    const txB = makeTx({ merchant: 'Starbucks', amount: -5.25, date: '2024-03-20' })

    const pairs = detectDuplicates([txA, txB])
    expect(pairs).toHaveLength(0)
  })

  it('does not match transactions with very different merchants', () => {
    const txA = makeTx({ merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })
    const txB = makeTx({ merchant: 'Target', amount: -5.25, date: '2024-03-15' })

    const pairs = detectDuplicates([txA, txB])
    expect(pairs).toHaveLength(0)
  })

  it('skips Plaid↔Plaid pairs', () => {
    const plaidA = makeTx({
      source: 'plaid',
      plaid_transaction_id: 'p1',
      merchant: 'Starbucks',
      amount: -5.25,
      date: '2024-03-15',
    })
    const plaidB = makeTx({
      source: 'plaid',
      plaid_transaction_id: 'p2',
      merchant: 'Starbucks',
      amount: -5.25,
      date: '2024-03-15',
    })

    const pairs = detectDuplicates([plaidA, plaidB])
    expect(pairs).toHaveLength(0)
  })

  it('orders pair with plaid as transactionA over csv_import', () => {
    const csvTx = makeTx({ source: 'csv_import', merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })
    const plaidTx = makeTx({ source: 'plaid', merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })

    const pairs = detectDuplicates([csvTx, plaidTx])

    expect(pairs).toHaveLength(1)
    expect(pairs[0].transactionA.source).toBe('plaid')
    expect(pairs[0].transactionB.source).toBe('csv_import')
  })

  it('orders pair with csv_import as transactionA over manual', () => {
    const manualTx = makeTx({ source: 'manual', merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })
    const csvTx = makeTx({ source: 'csv_import', merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })

    const pairs = detectDuplicates([manualTx, csvTx])

    expect(pairs).toHaveLength(1)
    expect(pairs[0].transactionA.source).toBe('csv_import')
    expect(pairs[0].transactionB.source).toBe('manual')
  })

  it('excludes dismissed pair IDs', () => {
    const txA = makeTx({ merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })
    const txB = makeTx({ merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })

    const pairId = txA.id < txB.id ? `${txA.id}-${txB.id}` : `${txB.id}-${txA.id}`
    const dismissed = new Set([pairId])

    const pairs = detectDuplicates([txA, txB], dismissed)
    expect(pairs).toHaveLength(0)
  })

  it('handles matching with stripped prefixes', () => {
    const plaidTx = makeTx({ source: 'plaid', merchant: 'SQ *Starbucks', amount: -5.25, date: '2024-03-15' })
    const manualTx = makeTx({ source: 'manual', merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })

    const pairs = detectDuplicates([plaidTx, manualTx])

    expect(pairs).toHaveLength(1)
    expect(pairs[0].confidence).toBe('exact')
  })

  it('sorts exact matches before fuzzy matches', () => {
    const tx1 = makeTx({ id: 'a', source: 'plaid', merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })
    const tx2 = makeTx({ id: 'b', source: 'manual', merchant: 'Starbucks', amount: -5.25, date: '2024-03-15' })
    const tx3 = makeTx({ id: 'c', source: 'csv_import', merchant: 'Starbucks Coffee', amount: -5.25, date: '2024-03-17' })

    const pairs = detectDuplicates([tx1, tx2, tx3])

    // Should have multiple pairs, exact first
    const exactPairs = pairs.filter(p => p.confidence === 'exact')
    const fuzzyPairs = pairs.filter(p => p.confidence === 'fuzzy')
    if (exactPairs.length > 0 && fuzzyPairs.length > 0) {
      const firstExactIdx = pairs.indexOf(exactPairs[0])
      const firstFuzzyIdx = pairs.indexOf(fuzzyPairs[0])
      expect(firstExactIdx).toBeLessThan(firstFuzzyIdx)
    }
  })
})

// ───── computeMergedFields ─────

describe('computeMergedFields', () => {
  it('adopts tags from discarded tx when kept tx has none', () => {
    const keep = makeTx({ tags: null })
    const discard = makeTx({ tags: 'groceries,weekly' })

    const merged = computeMergedFields(keep, discard)
    expect(merged.tags).toBe('groceries,weekly')
  })

  it('does not override existing tags on kept tx', () => {
    const keep = makeTx({ tags: 'existing' })
    const discard = makeTx({ tags: 'other' })

    const merged = computeMergedFields(keep, discard)
    expect(merged.tags).toBeUndefined()
  })

  it('adopts notes from discarded tx when kept tx has none', () => {
    const keep = makeTx({ notes: null })
    const discard = makeTx({ notes: 'Lunch with team' })

    const merged = computeMergedFields(keep, discard)
    expect(merged.notes).toBe('Lunch with team')
  })

  it('does not override existing notes on kept tx', () => {
    const keep = makeTx({ notes: 'my note' })
    const discard = makeTx({ notes: 'other note' })

    const merged = computeMergedFields(keep, discard)
    expect(merged.notes).toBeUndefined()
  })

  it('adopts category from discarded tx when kept tx has none', () => {
    const keep = makeTx({ category_id: null, category: null })
    const discard = makeTx({ category_id: 'cat-123', category: 'Groceries' })

    const merged = computeMergedFields(keep, discard)
    expect(merged.category_id).toBe('cat-123')
    expect(merged.category).toBe('Groceries')
  })

  it('does not override existing category on kept tx', () => {
    const keep = makeTx({ category_id: 'cat-abc', category: 'Food' })
    const discard = makeTx({ category_id: 'cat-123', category: 'Groceries' })

    const merged = computeMergedFields(keep, discard)
    expect(merged.category_id).toBeUndefined()
  })

  it('returns empty object when nothing to adopt', () => {
    const keep = makeTx({ tags: 'a', notes: 'b', category_id: 'c' })
    const discard = makeTx({ tags: null, notes: null, category_id: null })

    const merged = computeMergedFields(keep, discard)
    expect(Object.keys(merged)).toHaveLength(0)
  })
})
