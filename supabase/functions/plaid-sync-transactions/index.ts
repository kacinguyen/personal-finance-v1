import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getAuthenticatedUserId, createServiceClient } from '../_shared/auth.ts'
import { plaidPost } from '../_shared/plaid.ts'
import { getPlaidAccessToken } from '../_shared/crypto.ts'

serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const userId = await getAuthenticatedUserId(req)
    const { plaid_item_id } = await req.json() as { plaid_item_id: string }

    if (!plaid_item_id) throw new Error('Missing plaid_item_id')

    const supabase = createServiceClient()

    // Look up and decrypt access token + cursor via RPC
    const item = await getPlaidAccessToken(supabase, plaid_item_id, userId)

    // Pre-fetch user's categories and merchant rules for category resolution
    const { data: userCategories } = await supabase
      .from('categories')
      .select('id, normalized_name')
      .eq('user_id', userId)

    const { data: merchantRules } = await supabase
      .from('merchant_category_rules')
      .select('pattern, match_type, category_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: false })

    const categoryMap = new Map<string, string>()
    for (const cat of userCategories || []) {
      categoryMap.set(cat.normalized_name, cat.id)
    }

    let cursor = item.transaction_sync_cursor || undefined
    let added = 0
    let modified = 0
    let removed = 0
    let hasMore = true

    while (hasMore) {
      const syncBody: Record<string, unknown> = {
        access_token: item.access_token,
      }
      if (cursor) syncBody.cursor = cursor

      const syncData = await plaidPost<{
        added: PlaidTransaction[]
        modified: PlaidTransaction[]
        removed: { transaction_id: string }[]
        next_cursor: string
        has_more: boolean
      }>('/transactions/sync', syncBody)

      // Process added transactions
      for (const tx of syncData.added) {
        const mapped = mapTransaction(tx, userId, item.institution_name)
        const resolvedCategoryId = resolveCategoryId(
          mapped.merchant,
          mapped.category,
          categoryMap,
          merchantRules || [],
        )
        if (resolvedCategoryId) {
          mapped.category_id = resolvedCategoryId
          mapped.needs_review = false
        }
        const { error } = await supabase
          .from('transactions')
          .upsert(mapped, { onConflict: 'plaid_transaction_id' })
        if (!error) added++
      }

      // Process modified transactions
      for (const tx of syncData.modified) {
        // Check if the transaction has a user-modified split amount
        const { data: existing } = await supabase
          .from('transactions')
          .select('amount_modified_by_split')
          .eq('plaid_transaction_id', tx.transaction_id)
          .eq('user_id', userId)
          .maybeSingle()

        const mapped = mapTransaction(tx, userId, item.institution_name)
        const resolvedCategoryId = resolveCategoryId(
          mapped.merchant,
          mapped.category,
          categoryMap,
          merchantRules || [],
        )
        if (resolvedCategoryId) {
          mapped.category_id = resolvedCategoryId
          mapped.needs_review = false
        }

        // If amount was modified by a shared split, preserve the user's share
        if (existing?.amount_modified_by_split) {
          const { amount: _skipAmount, ...mappedWithoutAmount } = mapped
          const { error } = await supabase
            .from('transactions')
            .update(mappedWithoutAmount)
            .eq('plaid_transaction_id', tx.transaction_id)
            .eq('user_id', userId)
          if (!error) modified++
        } else {
          const { error } = await supabase
            .from('transactions')
            .upsert(mapped, { onConflict: 'plaid_transaction_id' })
          if (!error) modified++
        }
      }

      // Process removed transactions
      for (const tx of syncData.removed) {
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('plaid_transaction_id', tx.transaction_id)
          .eq('user_id', userId)
        if (!error) removed++
      }

      cursor = syncData.next_cursor
      hasMore = syncData.has_more
    }

    // Save updated cursor
    await supabase
      .from('plaid_items')
      .update({ transaction_sync_cursor: cursor })
      .eq('plaid_item_id', plaid_item_id)
      .eq('user_id', userId)

    return new Response(
      JSON.stringify({ added, modified, removed }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('plaid-sync-transactions error:', err instanceof Error ? err.message : err)
    return new Response(
      JSON.stringify({ error: 'Failed to sync transactions' }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})

// --- Types & Helpers ---

type PlaidTransaction = {
  transaction_id: string
  account_id: string
  date: string
  merchant_name?: string | null
  name: string
  amount: number
  personal_finance_category?: { primary: string } | null
  category?: string[] | null
  category_id?: string | null
  pending: boolean
  payment_channel?: string
}

/**
 * Map a Plaid transaction to our DB schema.
 * Mirrors plaidToTransaction() in src/types/transaction.ts.
 * Plaid amounts are positive for debits (expenses); we invert so negative = expense.
 */
function mapTransaction(
  tx: PlaidTransaction,
  userId: string,
  sourceName: string | null,
) {
  return {
    user_id: userId,
    date: tx.date,
    merchant: tx.merchant_name || tx.name,
    category: tx.personal_finance_category?.primary || tx.category?.[0] || null,
    category_id: null as string | null,
    amount: -tx.amount,
    tags: null,
    notes: null,
    plaid_transaction_id: tx.transaction_id,
    plaid_account_id: tx.account_id,
    plaid_category: tx.category || null,
    plaid_category_id: tx.category_id || null,
    pending: tx.pending,
    payment_channel: tx.payment_channel || null,
    source: 'plaid',
    source_name: sourceName || null,
    needs_review: true,
  }
}

type MerchantRule = {
  pattern: string
  match_type: string
  category_id: string
}

/**
 * Resolve category_id for a transaction using merchant rules (higher priority)
 * and then falling back to category text matching.
 */
function resolveCategoryId(
  merchant: string | null,
  categoryText: string | null,
  categoryMap: Map<string, string>,
  merchantRules: MerchantRule[],
): string | null {
  // 1. Try merchant rules first (already sorted by priority DESC)
  if (merchant) {
    const lowerMerchant = merchant.toLowerCase().trim()
    for (const rule of merchantRules) {
      const pattern = rule.pattern.toLowerCase()
      let matched = false
      if (rule.match_type === 'exact') {
        matched = lowerMerchant === pattern
      } else if (rule.match_type === 'starts_with') {
        matched = lowerMerchant.startsWith(pattern)
      } else if (rule.match_type === 'contains') {
        matched = lowerMerchant.includes(pattern)
      }
      if (matched) return rule.category_id
    }
  }

  // 2. Fall back to category text matching
  if (categoryText) {
    const normalized = categoryText.toLowerCase().trim()
    const id = categoryMap.get(normalized)
    if (id) return id
  }

  return null
}
