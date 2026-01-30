-- Create budgets table
-- Monthly budget allocations with personal finance classifications (need/want, fixed/variable)

CREATE TABLE budgets (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Category (using name until categories table is created)
  category TEXT NOT NULL UNIQUE,

  -- Budget amount (stored as DECIMAL for precision, following CLAUDE.md currency guidelines)
  monthly_limit DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Personal finance classification (supports 50/30/20 rule)
  budget_type TEXT NOT NULL CHECK (budget_type IN ('need', 'want')),
  -- need = essential for living (rent, groceries, utilities, insurance) - target 50%
  -- want = discretionary (dining out, entertainment, shopping) - target 30%

  flexibility TEXT NOT NULL CHECK (flexibility IN ('fixed', 'variable')),
  -- fixed = same amount each month (rent, subscriptions, insurance)
  -- variable = fluctuates (groceries, gas, dining out)

  -- Tracking options
  is_active BOOLEAN DEFAULT true,
  period_start DATE,              -- For custom budget periods
  period_end DATE,
  rollover_enabled BOOLEAN DEFAULT false,  -- Unused budget rolls to next month

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_budgets_category ON budgets(category);
CREATE INDEX idx_budgets_type ON budgets(budget_type);
CREATE INDEX idx_budgets_active ON budgets(is_active);

-- Trigger to auto-update updated_at timestamp
CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default budget categories with classifications
-- Categories from existing codebase + Shopping - Clothing
INSERT INTO budgets (category, monthly_limit, budget_type, flexibility) VALUES
  -- Needs (target 50% of income)
  ('Rent', 0, 'need', 'fixed'),
  ('Utilities', 0, 'need', 'variable'),
  ('Groceries', 0, 'need', 'variable'),
  ('Transportation', 0, 'need', 'variable'),
  ('Insurance', 0, 'need', 'fixed'),
  ('Healthcare', 0, 'need', 'variable'),

  -- Wants (target 30% of income)
  ('Dining Out', 0, 'want', 'variable'),
  ('Entertainment', 0, 'want', 'variable'),
  ('Shopping - General', 0, 'want', 'variable'),
  ('Shopping - Clothing', 0, 'want', 'variable'),
  ('Subscriptions', 0, 'want', 'fixed'),
  ('Travel', 0, 'want', 'variable'),
  ('Fitness', 0, 'want', 'fixed'),
  ('Self Care', 0, 'want', 'variable');

-- Comments for documentation
COMMENT ON TABLE budgets IS 'Monthly budget allocations per category with need/want and fixed/variable classifications';
COMMENT ON COLUMN budgets.monthly_limit IS 'Budget limit in dollars (DECIMAL for precision)';
COMMENT ON COLUMN budgets.budget_type IS 'Personal finance classification: need (essentials) or want (discretionary)';
COMMENT ON COLUMN budgets.flexibility IS 'Expense pattern: fixed (predictable) or variable (fluctuates)';
COMMENT ON COLUMN budgets.rollover_enabled IS 'If true, unused budget rolls over to next month';
