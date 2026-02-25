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

    // Look up and decrypt access token via RPC
    const item = await getPlaidAccessToken(supabase, plaid_item_id, userId)

    // Fetch balances from Plaid
    const balanceData = await plaidPost<{
      accounts: {
        account_id: string
        balances: {
          current: number | null
          available: number | null
        }
      }[]
    }>('/accounts/balance/get', { access_token: item.access_token })

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
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('plaid-sync-accounts error:', err instanceof Error ? err.message : err)
    return new Response(
      JSON.stringify({ error: 'Failed to sync account balances' }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
