-- Migration 038: Add pgcrypto + encrypted column + RPC functions for Plaid token encryption
-- Phase 1 of 2: Sets up infrastructure. Backfill happens via Edge Function.
-- Phase 2 (migration 039): Drop plaintext column after verification.
--
-- See docs/security/plaid-token-encryption.md for full rationale.

-- ============================================
-- 1. Enable pgcrypto extension
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 2. Add encrypted column (nullable during transition)
-- ============================================

ALTER TABLE plaid_items
  ADD COLUMN plaid_access_token_encrypted BYTEA;

-- ============================================
-- 3. RPC: Insert plaid_item with encrypted token
-- ============================================

CREATE OR REPLACE FUNCTION insert_plaid_item(
  p_user_id UUID,
  p_plaid_item_id TEXT,
  p_access_token TEXT,
  p_institution_name TEXT,
  p_institution_id TEXT,
  p_status TEXT,
  p_encryption_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO plaid_items (
    user_id, plaid_item_id, plaid_access_token_encrypted,
    institution_name, institution_id, status
  ) VALUES (
    p_user_id,
    p_plaid_item_id,
    pgp_sym_encrypt(p_access_token, p_encryption_key),
    p_institution_name,
    p_institution_id,
    p_status
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================
-- 4. RPC: Decrypt access token + metadata
--    Falls back to plaintext during transition
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
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    CASE
      WHEN pi.plaid_access_token_encrypted IS NOT NULL
        THEN pgp_sym_decrypt(pi.plaid_access_token_encrypted, p_encryption_key)::TEXT
      ELSE pi.plaid_access_token
    END AS access_token,
    pi.transaction_sync_cursor,
    pi.institution_name
  FROM plaid_items pi
  WHERE pi.plaid_item_id = p_plaid_item_id
    AND pi.user_id = p_user_id;
END;
$$;

-- ============================================
-- 5. RPC: Verify item ownership (for re-auth)
-- ============================================

CREATE OR REPLACE FUNCTION verify_plaid_item_ownership(
  p_plaid_item_id TEXT,
  p_user_id UUID,
  p_encryption_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  SELECT
    CASE
      WHEN pi.plaid_access_token_encrypted IS NOT NULL
        THEN pgp_sym_decrypt(pi.plaid_access_token_encrypted, p_encryption_key)::TEXT
      ELSE pi.plaid_access_token
    END
  INTO v_token
  FROM plaid_items pi
  WHERE pi.plaid_item_id = p_plaid_item_id
    AND pi.user_id = p_user_id;

  RETURN v_token;
END;
$$;

-- ============================================
-- 6. RPC: Backfill helper (encrypt one row)
-- ============================================

CREATE OR REPLACE FUNCTION backfill_encrypt_plaid_token(
  p_item_id UUID,
  p_encryption_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE plaid_items
  SET plaid_access_token_encrypted = pgp_sym_encrypt(plaid_access_token, p_encryption_key),
      plaid_access_token = NULL
  WHERE id = p_item_id
    AND plaid_access_token IS NOT NULL
    AND plaid_access_token_encrypted IS NULL;
END;
$$;

-- ============================================
-- 7. Restrict functions to service_role only
-- ============================================

REVOKE ALL ON FUNCTION insert_plaid_item(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION get_plaid_access_token(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION verify_plaid_item_ownership(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION backfill_encrypt_plaid_token(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ============================================
-- 8. Column comments
-- ============================================

COMMENT ON COLUMN plaid_items.plaid_access_token IS
  'DEPRECATED - plaintext token, will be dropped after backfill. See plaid_access_token_encrypted.';
COMMENT ON COLUMN plaid_items.plaid_access_token_encrypted IS
  'PGP-symmetric-encrypted Plaid access token (AES-256). Decrypt via get_plaid_access_token() RPC.';
