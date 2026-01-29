-- Create transactions table
-- Supports both Plaid sync and CSV imports with user-defined tags/notes

CREATE TABLE transactions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core transaction fields (maps to CSV: date, merchant, category, amount)
  date DATE NOT NULL,
  merchant TEXT NOT NULL,
  category TEXT,
  amount DECIMAL(12,2) NOT NULL,  -- Negative for expenses, positive for income

  -- User-defined fields (maps to CSV: tags/notes)
  tags TEXT,                       -- Comma-separated tags (e.g., "groceries,weekly,costco")
  notes TEXT,                      -- Free-form notes

  -- Plaid-specific fields
  plaid_transaction_id TEXT UNIQUE,
  plaid_account_id TEXT,
  plaid_category TEXT[],           -- Plaid's hierarchical category array
  plaid_category_id TEXT,
  pending BOOLEAN DEFAULT FALSE,
  payment_channel TEXT,            -- 'online', 'in store', 'other'

  -- Source tracking
  source TEXT NOT NULL DEFAULT 'manual',  -- 'plaid', 'csv_import', 'manual'
  source_name TEXT,                -- e.g., 'Chase Credit', 'Venmo'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_plaid_id ON transactions(plaid_transaction_id);
CREATE INDEX idx_transactions_source ON transactions(source);

-- Trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE transactions IS 'Financial transactions from Plaid, CSV imports, or manual entry';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount: negative for expenses, positive for income';
COMMENT ON COLUMN transactions.tags IS 'Comma-separated user-defined tags for categorization';
COMMENT ON COLUMN transactions.source IS 'Data source: plaid, csv_import, or manual';
COMMENT ON COLUMN transactions.plaid_category IS 'Plaid hierarchical category array (e.g., {Food and Drink, Restaurants})';
