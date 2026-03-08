import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getAuthenticatedUserId, createServiceClient } from '../_shared/auth.ts'
import { plaidPost, mapPlaidAccountType } from '../_shared/plaid.ts'
import { insertPlaidItem } from '../_shared/crypto.ts'

serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const userId = await getAuthenticatedUserId(req)
    const { public_token, institution } = await req.json() as {
      public_token: string
      institution: { institution_id: string; name: string }
    }

    if (!public_token || !institution) {
      throw new Error('Missing public_token or institution')
    }

    // 1. Exchange public token for access token
    const exchangeData = await plaidPost<{
      access_token: string
      item_id: string
    }>('/item/public_token/exchange', { public_token })

    const supabase = createServiceClient()

    // 2. Insert plaid_items row (access token is encrypted via RPC)
    await insertPlaidItem(supabase, {
      userId,
      plaidItemId: exchangeData.item_id,
      accessToken: exchangeData.access_token,
      institutionName: institution.name,
      institutionId: institution.institution_id,
      status: 'active',
    })

    // 3. Fetch accounts from Plaid
    const accountsData = await plaidPost<{
      accounts: {
        account_id: string
        name: string
        official_name: string | null
        type: string
        subtype: string | null
        mask: string | null
        balances: {
          current: number | null
          available: number | null
          iso_currency_code: string | null
        }
      }[]
    }>('/accounts/get', { access_token: exchangeData.access_token })

    // 4. Upsert each account
    const upsertedAccounts = []
    for (const pa of accountsData.accounts) {
      const accountType = mapPlaidAccountType(pa.type, pa.subtype)
      const balanceCurrent = pa.balances.current ?? 0
      const balanceAvailable = pa.balances.available ?? null

      const { data: acct, error: acctError } = await supabase
        .from('accounts')
        .upsert(
          {
            user_id: userId,
            name: pa.official_name || pa.name,
            institution_name: institution.name,
            account_type: accountType,
            subtype: pa.subtype,
            mask: pa.mask,
            balance_current: balanceCurrent,
            balance_available: balanceAvailable,
            currency: pa.balances.iso_currency_code || 'USD',
            plaid_account_id: pa.account_id,
            plaid_item_id: exchangeData.item_id,
            is_manual: false,
            is_active: true,
          },
          { onConflict: 'plaid_account_id' },
        )
        .select()
        .single()

      if (acctError) {
        console.error(`Account upsert error:`, acctError.message)
        continue
      }

      upsertedAccounts.push(acct)

      // 5. Insert initial balance snapshot
      await supabase.from('account_balance_history').insert({
        account_id: acct.id,
        user_id: userId,
        balance: balanceCurrent,
      })
    }

    return new Response(
      JSON.stringify({ accounts: upsertedAccounts, item_id: exchangeData.item_id }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('plaid-exchange-token error:', message)
    return new Response(
      JSON.stringify({ error: `Failed to exchange token and link accounts: ${message}` }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
