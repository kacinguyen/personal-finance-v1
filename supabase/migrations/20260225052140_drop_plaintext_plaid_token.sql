-- Migration 039: Drop plaintext column after backfill is verified.
-- Run ONLY after confirming all rows have been encrypted via the backfill Edge Function.
--
-- See docs/security/plaid-token-encryption.md for full rationale.

-- ============================================
-- 1. Safety check: fail if unencrypted tokens remain
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM plaid_items
    WHERE plaid_access_token IS NOT NULL
      AND plaid_access_token_encrypted IS NULL
  ) THEN
    RAISE EXCEPTION 'Backfill incomplete: plaintext tokens still exist. Run the backfill Edge Function first.';
  END IF;
END;
$$;

-- ============================================
-- 2. Drop plaintext column, rename encrypted
-- ============================================

ALTER TABLE plaid_items DROP COLUMN plaid_access_token;
ALTER TABLE plaid_items RENAME COLUMN plaid_access_token_encrypted TO plaid_access_token;

-- ============================================
-- 3. Simplify RPC functions (remove CASE fallback)
-- ============================================

CREATE OR REPLACE FUNCTION get_plaid_access_token(
  p_plaid_item_id TEXT,
  p_user_id UUID,
  p_encryption_key TEXT
)
RETURNS TABLE (
  access_token TEXT,
  transaction_sync_cursor TEXT,
  institution_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pgp_sym_decrypt(pi.plaid_access_token, p_encryption_key)::TEXT AS access_token,
    pi.transaction_sync_cursor,
    pi.institution_name
  FROM plaid_items pi
  WHERE pi.plaid_item_id = p_plaid_item_id
    AND pi.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION verify_plaid_item_ownership(
  p_plaid_item_id TEXT,
  p_user_id UUID,
  p_encryption_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT pgp_sym_decrypt(pi.plaid_access_token, p_encryption_key)::TEXT
  INTO v_token
  FROM plaid_items pi
  WHERE pi.plaid_item_id = p_plaid_item_id
    AND pi.user_id = p_user_id;

  RETURN v_token;
END;
$$;

-- ============================================
-- 4. Drop backfill function (no longer needed)
-- ============================================

DROP FUNCTION IF EXISTS backfill_encrypt_plaid_token(UUID, TEXT);

-- ============================================
-- 5. Re-apply access restrictions
-- ============================================

REVOKE ALL ON FUNCTION get_plaid_access_token(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION verify_plaid_item_ownership(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ============================================
-- 6. Update column comment
-- ============================================

COMMENT ON COLUMN plaid_items.plaid_access_token IS
  'PGP-symmetric-encrypted Plaid access token (AES-256). Decrypt via get_plaid_access_token() RPC only.';
