import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getAuthenticatedUserId, createServiceClient } from '../_shared/auth.ts'
import { plaidPost } from '../_shared/plaid.ts'
import { getPlaidAccessToken } from '../_shared/crypto.ts'

/**
 * Backfill counterparty metadata for existing Plaid transactions.
 * Uses /transactions/get (date-range) to fetch full transaction objects
 * and updates only the 5 new counterparty columns on matching rows.
 */
serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // Support both user JWT auth and service-role auth (for CLI/admin use)
    const { plaid_item_id, user_id: bodyUserId } = await req.json() as {
      plaid_item_id: string
      user_id?: string
    }

    let userId: string
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')

    // Check if this is a service role token (contains "service_role" in payload)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.role === 'service_role') {
        if (!bodyUserId) throw new Error('service_role auth requires user_id in body')
        userId = bodyUserId
      } else {
        userId = await getAuthenticatedUserId(req)
      }
    } catch {
      userId = await getAuthenticatedUserId(req)
    }

    if (!plaid_item_id) throw new Error('Missing plaid_item_id')

    const supabase = createServiceClient()
    const item = await getPlaidAccessToken(supabase, plaid_item_id, userId)

    // Get date range of existing Plaid transactions for this item's accounts
    const { data: dateRange } = await supabase
      .from('transactions')
      .select('date')
      .eq('user_id', userId)
      .eq('source', 'plaid')
      .not('plaid_transaction_id', 'is', null)
      .order('date', { ascending: true })
      .limit(1)
      .single()

    if (!dateRange) {
      return new Response(
        JSON.stringify({ updated: 0, message: 'No Plaid transactions to backfill' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } },
      )
    }

    const startDate = dateRange.date
    const endDate = new Date().toISOString().split('T')[0]

    // Fetch all transactions from Plaid via /transactions/get (paginated)
    let offset = 0
    const count = 500
    let totalUpdated = 0
    let totalTransactions = 0
    const stats = { very_high: 0, high: 0, medium: 0, low: 0, none: 0 }

    let hasMore = true
    while (hasMore) {
      const response = await plaidPost<{
        transactions: PlaidTransactionFull[]
        total_transactions: number
      }>('/transactions/get', {
        access_token: item.access_token,
        start_date: startDate,
        end_date: endDate,
        options: { count, offset },
      })

      totalTransactions = response.total_transactions

      for (const tx of response.transactions) {
        const counterparty = tx.counterparties?.find((c) => c.type === 'merchant')
          || tx.counterparties?.[0]
          || null
        const confidence = counterparty?.confidence_level || null

        // Track stats
        if (confidence === 'VERY_HIGH') stats.very_high++
        else if (confidence === 'HIGH') stats.high++
        else if (confidence === 'MEDIUM') stats.medium++
        else if (confidence === 'LOW') stats.low++
        else stats.none++

        const { error } = await supabase
          .from('transactions')
          .update({
            plaid_counterparty: tx.counterparties || null,
            plaid_counterparty_confidence: confidence,
            plaid_merchant_entity_id: tx.merchant_entity_id || counterparty?.entity_id || null,
            plaid_detailed_category: tx.personal_finance_category?.detailed || null,
            plaid_location: tx.location || null,
          })
          .eq('plaid_transaction_id', tx.transaction_id)
          .eq('user_id', userId)

        if (!error) totalUpdated++
      }

      offset += response.transactions.length
      hasMore = offset < totalTransactions
    }

    return new Response(
      JSON.stringify({
        updated: totalUpdated,
        total_plaid_transactions: totalTransactions,
        confidence_breakdown: stats,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('plaid-backfill-counterparty error:', err instanceof Error ? err.message : err)
    return new Response(
      JSON.stringify({ error: 'Failed to backfill counterparty data' }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})

// --- Types ---

type PlaidCounterparty = {
  name?: string | null
  type?: string | null
  website?: string | null
  logo_url?: string | null
  confidence_level?: string | null
  entity_id?: string | null
  phone_number?: string | null
}

type PlaidTransactionFull = {
  transaction_id: string
  account_id: string
  date: string
  merchant_name?: string | null
  name: string
  amount: number
  personal_finance_category?: { primary: string; detailed?: string } | null
  category?: string[] | null
  pending: boolean
  payment_channel?: string
  counterparties?: PlaidCounterparty[] | null
  merchant_entity_id?: string | null
  location?: Record<string, unknown> | null
}
