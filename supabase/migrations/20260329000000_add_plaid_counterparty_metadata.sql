-- Add additional Plaid metadata columns for smart categorization
-- Captures counterparty, confidence_level, location, detailed category, and merchant_entity_id

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS plaid_counterparty JSONB,
  ADD COLUMN IF NOT EXISTS plaid_counterparty_confidence TEXT,
  ADD COLUMN IF NOT EXISTS plaid_merchant_entity_id TEXT,
  ADD COLUMN IF NOT EXISTS plaid_detailed_category TEXT,
  ADD COLUMN IF NOT EXISTS plaid_location JSONB;

-- Index on merchant_entity_id for fast rule lookups
CREATE INDEX IF NOT EXISTS idx_transactions_plaid_merchant_entity_id
  ON transactions(plaid_merchant_entity_id)
  WHERE plaid_merchant_entity_id IS NOT NULL;

-- Index on confidence for filtering high-confidence auto-categorization candidates
CREATE INDEX IF NOT EXISTS idx_transactions_plaid_counterparty_confidence
  ON transactions(plaid_counterparty_confidence)
  WHERE plaid_counterparty_confidence IS NOT NULL;
