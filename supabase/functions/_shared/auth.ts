/**
 * Shared auth helpers for Supabase Edge Functions.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2'

/**
 * Create a Supabase client with the service role key (bypasses RLS).
 */
export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

/**
 * Extract and verify the authenticated user ID from the request's Authorization header.
 * Throws if no valid session.
 */
export async function getAuthenticatedUserId(req: Request): Promise<string> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new Error('Missing Authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  return user.id
}
