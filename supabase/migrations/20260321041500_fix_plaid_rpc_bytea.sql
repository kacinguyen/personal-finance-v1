-- Fix get_plaid_access_token and verify_plaid_item_ownership RPC functions.
-- After migration 039 renamed plaid_access_token_encrypted to plaid_access_token (BYTEA),
-- the old CASE fallback functions were still active, causing "CASE types bytea and text
-- cannot be matched" errors.

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

REVOKE ALL ON FUNCTION get_plaid_access_token(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION verify_plaid_item_ownership(TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
