/**
 * Shared helpers for encrypted Plaid token operations via Supabase RPC.
 * All encryption/decryption happens inside SECURITY DEFINER SQL functions.
 * The encryption key is passed from Deno.env — it never touches the database.
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.93.2'

function getEncryptionKey(): string {
  const key = Deno.env.get('PLAID_ENCRYPTION_KEY')
  if (!key) {
    throw new Error('Missing PLAID_ENCRYPTION_KEY environment variable')
  }
  return key
}

/**
 * Insert a plaid_item with an encrypted access token.
 * Returns the new row's UUID.
 */
export async function insertPlaidItem(
  supabase: SupabaseClient,
  params: {
    userId: string
    plaidItemId: string
    accessToken: string
    institutionName: string
    institutionId: string
    status: string
  },
): Promise<string> {
  const { data, error } = await supabase.rpc('insert_plaid_item', {
    p_user_id: params.userId,
    p_plaid_item_id: params.plaidItemId,
    p_access_token: params.accessToken,
    p_institution_name: params.institutionName,
    p_institution_id: params.institutionId,
    p_status: params.status,
    p_encryption_key: getEncryptionKey(),
  })

  if (error) {
    // Unique violation on plaid_item_id — item already exists, return existing row
    if (error.code === '23505') {
      const { data: existing, error: fetchErr } = await supabase
        .from('plaid_items')
        .select('id')
        .eq('plaid_item_id', params.plaidItemId)
        .eq('user_id', params.userId)
        .single()
      if (fetchErr || !existing) {
        throw new Error(`Plaid item already exists for a different user`)
      }
      return existing.id as string
    }
    throw new Error(`Failed to insert plaid item: ${error.message}`)
  }
  return data as string
}

/**
 * Retrieve the decrypted access token + metadata for a plaid item.
 */
export async function getPlaidAccessToken(
  supabase: SupabaseClient,
  plaidItemId: string,
  userId: string,
): Promise<{ access_token: string; transaction_sync_cursor: string | null; institution_name: string | null }> {
  const { data, error } = await supabase.rpc('get_plaid_access_token', {
    p_plaid_item_id: plaidItemId,
    p_user_id: userId,
    p_encryption_key: getEncryptionKey(),
  })

  if (error) throw new Error(`Failed to retrieve plaid access token`)
  if (!data || data.length === 0) throw new Error('Plaid item not found')

  const row = data[0]
  return {
    access_token: row.access_token,
    transaction_sync_cursor: row.transaction_sync_cursor,
    institution_name: row.institution_name,
  }
}

/**
 * Verify a user owns a plaid item and return the decrypted access token.
 * Used for re-auth flow.
 */
export async function verifyPlaidItemOwnership(
  supabase: SupabaseClient,
  plaidItemId: string,
  userId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('verify_plaid_item_ownership', {
    p_plaid_item_id: plaidItemId,
    p_user_id: userId,
    p_encryption_key: getEncryptionKey(),
  })

  if (error) throw new Error(`Failed to verify plaid item ownership`)
  if (!data) throw new Error('Plaid item not found for user')

  return data as string
}

/**
 * Backfill: encrypt a single plaintext token row.
 */
export async function backfillEncryptToken(
  supabase: SupabaseClient,
  itemId: string,
): Promise<void> {
  const { error } = await supabase.rpc('backfill_encrypt_plaid_token', {
    p_item_id: itemId,
    p_encryption_key: getEncryptionKey(),
  })

  if (error) throw new Error(`Failed to backfill token for item ${itemId}`)
}
