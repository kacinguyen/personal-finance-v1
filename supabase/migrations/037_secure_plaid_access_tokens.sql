-- Migration: Secure plaid_access_token from client access
-- The access token should ONLY be readable by the service role (Edge Functions).
-- This prevents any client-side query from accessing raw Plaid tokens.

-- ============================================
-- 1. Revoke column-level access to plaid_access_token
-- ============================================

-- Revoke SELECT on the sensitive column from authenticated and anon roles.
-- The service_role (used by Edge Functions) retains full access.
REVOKE SELECT (plaid_access_token) ON plaid_items FROM authenticated;
REVOKE SELECT (plaid_access_token) ON plaid_items FROM anon;

-- Also revoke access to transaction_sync_cursor (internal bookkeeping)
REVOKE SELECT (transaction_sync_cursor) ON plaid_items FROM authenticated;
REVOKE SELECT (transaction_sync_cursor) ON plaid_items FROM anon;

-- ============================================
-- 2. Grant explicit column-level SELECT on safe columns only
-- ============================================

-- Ensure authenticated users can still read the non-sensitive columns
GRANT SELECT (
  id,
  user_id,
  plaid_item_id,
  institution_name,
  institution_id,
  status,
  created_at,
  updated_at
) ON plaid_items TO authenticated;

-- ============================================
-- 3. Add comment documenting the security model
-- ============================================

COMMENT ON COLUMN plaid_items.plaid_access_token IS
  'Plaid access token - column-level SELECT revoked from authenticated/anon roles. '
  'Only accessible via service_role (Edge Functions). Encrypt via Supabase Vault in production.';
