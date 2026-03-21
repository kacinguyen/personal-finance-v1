/**
 * Standard CORS headers for Supabase Edge Functions.
 */

const ALLOWED_ORIGINS = [
  'https://pachi-personal-finance-tracker.vercel.app',
  'https://personal-finance-app-v1-puce.vercel.app',
  'https://personal-finance-app-v1-kacinguyens-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
]

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  }
}

/** @deprecated Use getCorsHeaders(req) instead for origin-aware CORS. */
export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
