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

    // Look up access token
    const { data: item, error: itemError } = await supabase
      .from('plaid_items')
      .select('plaid_access_token')
      .eq('plaid_item_id', plaid_item_id)
      .eq('user_id', userId)
      .single()

    if (itemError || !item) throw new Error('Plaid item not found')

    // Fetch balances from Plaid
    const balanceData = await plaidPost<{
      accounts: {
        account_id: string
        balances: {
          current: number | null
          available: number | null
        }
      }[]
    }>('/accounts/balance/get', { access_token: item.plaid_access_token })

    // Update each account's balances and insert snapshots
    let updated = 0
    for (const pa of balanceData.accounts) {
      const balanceCurrent = pa.balances.current ?? 0
      const balanceAvailable = pa.balances.available ?? null

      // Update account balance
      const { data: acct } = await supabase
        .from('accounts')
        .update({
          balance_current: balanceCurrent,
          balance_available: balanceAvailable,
        })
        .eq('plaid_account_id', pa.account_id)
        .eq('user_id', userId)
        .select('id')
        .single()

      if (acct) {
        // Insert balance snapshot
        await supabase.from('account_balance_history').insert({
          account_id: acct.id,
          user_id: userId,
          balance: balanceCurrent,
        })
        updated++
      }
    }

    return new Response(
      JSON.stringify({ updated }),
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
