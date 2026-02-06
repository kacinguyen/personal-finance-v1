-- Migration: Add transaction_sync_cursor to plaid_items for cursor-based Plaid transaction sync

ALTER TABLE plaid_items
  ADD COLUMN transaction_sync_cursor TEXT;

COMMENT ON COLUMN plaid_items.transaction_sync_cursor IS 'Cursor for Plaid /transactions/sync pagination';
