/**
 * Shared Plaid API helpers for Supabase Edge Functions.
 * Uses direct HTTP calls (no SDK) for Deno compatibility.
 */

type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'investment'
  | 'loan'
  | 'mortgage'
  | 'retirement_401k'
  | 'retirement_ira'

export function getPlaidBaseUrl(): string {
  const env = Deno.env.get('PLAID_ENV') || 'sandbox'
  switch (env) {
    case 'production':
      return 'https://production.plaid.com'
    case 'development':
      return 'https://development.plaid.com'
    default:
      return 'https://sandbox.plaid.com'
  }
}

export function getPlaidHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID') || '',
    'PLAID-SECRET': Deno.env.get('PLAID_SECRET') || '',
  }
}

/**
 * Map Plaid account type/subtype to our app's AccountType.
 */
export function mapPlaidAccountType(type: string, subtype: string | null): AccountType {
  const st = (subtype || '').toLowerCase()

  switch (type) {
    case 'depository':
      return st === 'checking' ? 'checking' : 'savings'
    case 'credit':
      return 'credit_card'
    case 'investment':
      if (['401k', '403b', '457b'].includes(st)) return 'retirement_401k'
      if (['ira', 'roth', 'roth ira', 'sep ira', 'simple ira'].includes(st)) return 'retirement_ira'
      return 'investment'
    case 'loan':
      return st === 'mortgage' ? 'mortgage' : 'loan'
    default:
      return 'checking'
  }
}

/**
 * Generic POST to Plaid API with error handling.
 */
export async function plaidPost<T = Record<string, unknown>>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const url = `${getPlaidBaseUrl()}${endpoint}`
  const clientId = Deno.env.get('PLAID_CLIENT_ID') || ''
  const secret = Deno.env.get('PLAID_SECRET') || ''

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      secret,
      ...body,
    }),
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}))
    const msg = (errorBody as Record<string, string>).error_message || res.statusText
    throw new Error(`Plaid API error (${endpoint}): ${msg}`)
  }

  return res.json() as Promise<T>
}
