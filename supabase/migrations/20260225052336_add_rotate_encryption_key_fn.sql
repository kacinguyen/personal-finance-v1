-- Migration: Add helper function for encryption key rotation.
-- Decrypts with old key, re-encrypts with new key, one row at a time.

CREATE OR REPLACE FUNCTION rotate_plaid_encryption_key(
  p_item_id UUID,
  p_old_key TEXT,
  p_new_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_plaintext TEXT;
BEGIN
  -- Decrypt with old key
  SELECT pgp_sym_decrypt(plaid_access_token, p_old_key)::TEXT
  INTO v_plaintext
  FROM plaid_items
  WHERE id = p_item_id;

  IF v_plaintext IS NULL THEN
    RAISE EXCEPTION 'Could not decrypt token for item %', p_item_id;
  END IF;

  -- Re-encrypt with new key
  UPDATE plaid_items
  SET plaid_access_token = pgp_sym_encrypt(v_plaintext, p_new_key)
  WHERE id = p_item_id;
END;
$$;

REVOKE ALL ON FUNCTION rotate_plaid_encryption_key(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
