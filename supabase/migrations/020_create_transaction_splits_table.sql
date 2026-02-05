-- Create transaction_splits table for splitting transactions across categories
-- When a transaction is split, the parent transaction keeps its total amount
-- but the splits define how that amount is allocated across categories

CREATE TABLE transaction_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to parent transaction
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,

  -- Split details
  amount DECIMAL(12,2) NOT NULL,  -- Portion of the transaction amount
  category TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying splits by transaction
CREATE INDEX idx_transaction_splits_transaction_id ON transaction_splits(transaction_id);

-- RLS policies
ALTER TABLE transaction_splits ENABLE ROW LEVEL SECURITY;

-- Users can only see splits for their own transactions
CREATE POLICY "Users can view own transaction splits"
  ON transaction_splits FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

-- Users can insert splits for their own transactions
CREATE POLICY "Users can insert own transaction splits"
  ON transaction_splits FOR INSERT
  WITH CHECK (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

-- Users can update their own transaction splits
CREATE POLICY "Users can update own transaction splits"
  ON transaction_splits FOR UPDATE
  USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own transaction splits
CREATE POLICY "Users can delete own transaction splits"
  ON transaction_splits FOR DELETE
  USING (
    transaction_id IN (
      SELECT id FROM transactions WHERE user_id = auth.uid()
    )
  );

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_transaction_splits_updated_at
  BEFORE UPDATE ON transaction_splits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE transaction_splits IS 'Splits for allocating a single transaction across multiple categories';
COMMENT ON COLUMN transaction_splits.amount IS 'Portion of the parent transaction amount allocated to this category';
