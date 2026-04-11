-- Migration: Create pending_adjustments table
-- Tracks expected returns, price matches, and disputes where money is expected back from a merchant

CREATE TABLE IF NOT EXISTS pending_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('expected_return', 'price_match', 'dispute')),
  expected_amount NUMERIC(12, 2) NOT NULL,  -- Positive: how much the user expects back
  description TEXT,                          -- e.g. "Returning 2 of 3 dresses"
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'expired', 'cancelled')),
  resolved_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  expires_at DATE,                           -- Optional: auto-expire after return window
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_adjustments_user_status ON pending_adjustments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pending_adjustments_transaction ON pending_adjustments(transaction_id);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER pending_adjustments_updated_at
  BEFORE UPDATE ON pending_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE pending_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending adjustments"
  ON pending_adjustments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending adjustments"
  ON pending_adjustments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending adjustments"
  ON pending_adjustments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending adjustments"
  ON pending_adjustments FOR DELETE
  USING (auth.uid() = user_id);
