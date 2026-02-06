import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getAuthenticatedUserId, createServiceClient } from '../_shared/auth.ts'
import { plaidPost } from '../_shared/plaid.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userId = await getAuthenticatedUserId(req)
    const { plaid_item_id } = await req.json() as { plaid_item_id: string }

    if (!plaid_item_id) throw new Error('Missing plaid_item_id')

    const supabase = createServiceClient()

    // Look up access token + cursor
    const { data: item, error: itemError } = await supabase
      .from('plaid_items')
      .select('plaid_access_token, transaction_sync_cursor, institution_name')
      .eq('plaid_item_id', plaid_item_id)
      .eq('user_id', userId)
      .single()

    if (itemError || !item) throw new Error('Plaid item not found')

    let cursor = item.transaction_sync_cursor || undefined
    let added = 0
    let modified = 0
    let removed = 0
    let hasMore = true

    while (hasMore) {
      const syncBody: Record<string, unknown> = {
        access_token: item.plaid_access_token,
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
        const { error } = await supabase
          .from('transactions')
          .upsert(
            mapTransaction(tx, userId, item.institution_name),
            { onConflict: 'plaid_transaction_id' },
          )
        if (!error) added++
      }

      // Process modified transactions
      for (const tx of syncData.modified) {
        const { error } = await supabase
          .from('transactions')
          .upsert(
            mapTransaction(tx, userId, item.institution_name),
            { onConflict: 'plaid_transaction_id' },
          )
        if (!error) modified++
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
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
    category_id: null,
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
  }
}
