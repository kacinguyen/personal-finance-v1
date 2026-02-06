import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { getAuthenticatedUserId } from '../_shared/auth.ts'
import { plaidPost } from '../_shared/plaid.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const userId = await getAuthenticatedUserId(req)
    const body = await req.json().catch(() => ({}))
    const accessToken = (body as Record<string, string | undefined>).access_token

    const plaidBody: Record<string, unknown> = {
      user: { client_user_id: userId },
      client_name: 'Personal Finance App',
      products: accessToken ? [] : ['transactions'],
      country_codes: ['US'],
      language: 'en',
    }

    // If access_token provided, this is a re-auth / update mode
    if (accessToken) {
      plaidBody.access_token = accessToken
    }

    const data = await plaidPost<{ link_token: string }>('/link/token/create', plaidBody)

    return new Response(
      JSON.stringify({ link_token: data.link_token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
