import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getAuthenticatedUserId, createServiceClient } from '../_shared/auth.ts'
import { plaidPost } from '../_shared/plaid.ts'
import { verifyPlaidItemOwnership } from '../_shared/crypto.ts'

serve(async (req) => {
  const cors = getCorsHeaders(req)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    const userId = await getAuthenticatedUserId(req)
    const body = await req.json().catch(() => ({}))
    const plaidItemId = (body as Record<string, string | undefined>).plaid_item_id

    const plaidBody: Record<string, unknown> = {
      user: { client_user_id: userId },
      client_name: 'Personal Finance App',
      products: plaidItemId ? [] : ['transactions', 'investments'],
      country_codes: ['US'],
      language: 'en',
    }

    // If plaid_item_id provided, this is a re-auth / update mode.
    // Verify ownership and decrypt the access token via RPC.
    if (plaidItemId) {
      const supabase = createServiceClient()
      const decryptedToken = await verifyPlaidItemOwnership(supabase, plaidItemId, userId)
      plaidBody.access_token = decryptedToken
    }

    const data = await plaidPost<{ link_token: string }>('/link/token/create', plaidBody)

    return new Response(
      JSON.stringify({ link_token: data.link_token }),
      { headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('plaid-create-link-token error:', err instanceof Error ? err.message : err)
    return new Response(
      JSON.stringify({ error: 'Failed to create link token' }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } },
    )
  }
})
