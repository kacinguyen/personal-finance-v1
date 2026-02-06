-- Migration: Create accounts, balance history, and plaid_items tables
-- Supports manual account tracking and future Plaid integration

-- ============================================
-- 1. Create accounts table
-- ============================================

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Account details
  name TEXT NOT NULL,
  institution_name TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN (
    'checking', 'savings', 'credit_card', 'investment',
    'loan', 'mortgage', 'retirement_401k', 'retirement_ira'
  )),
  subtype TEXT,
  mask TEXT,  -- Last 4 digits

  -- Balances
  balance_current DECIMAL(14,2) NOT NULL DEFAULT 0,
  balance_available DECIMAL(14,2),
  currency TEXT NOT NULL DEFAULT 'USD',

  -- Plaid fields (nullable for manual accounts)
  plaid_account_id TEXT UNIQUE,
  plaid_item_id TEXT,

  -- Flags
  is_manual BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_plaid_account_id ON accounts(plaid_account_id);
CREATE INDEX idx_accounts_account_type ON accounts(account_type);

-- Reuse existing trigger function
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Create account_balance_history table
-- ============================================

CREATE TABLE account_balance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance DECIMAL(14,2) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_balance_history_account_id ON account_balance_history(account_id);
CREATE INDEX idx_balance_history_user_id ON account_balance_history(user_id);
CREATE INDEX idx_balance_history_recorded_at ON account_balance_history(recorded_at DESC);

-- ============================================
-- 3. Create plaid_items table
-- ============================================

CREATE TABLE plaid_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plaid_item_id TEXT NOT NULL UNIQUE,
  plaid_access_token TEXT, -- encrypt via Vault in prod
  institution_name TEXT,
  institution_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'revoked')),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reuse existing trigger function
CREATE TRIGGER update_plaid_items_updated_at
  BEFORE UPDATE ON plaid_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Enable Row-Level Security
-- ============================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_balance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE plaid_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. RLS Policies for accounts
-- ============================================

DROP POLICY IF EXISTS "Users can view own accounts" ON accounts;
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own accounts" ON accounts;
CREATE POLICY "Users can insert own accounts" ON accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own accounts" ON accounts;
CREATE POLICY "Users can update own accounts" ON accounts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own accounts" ON accounts;
CREATE POLICY "Users can delete own accounts" ON accounts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 6. RLS Policies for account_balance_history
-- ============================================

DROP POLICY IF EXISTS "Users can view own balance history" ON account_balance_history;
CREATE POLICY "Users can view own balance history" ON account_balance_history
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own balance history" ON account_balance_history;
CREATE POLICY "Users can insert own balance history" ON account_balance_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own balance history" ON account_balance_history;
CREATE POLICY "Users can update own balance history" ON account_balance_history
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own balance history" ON account_balance_history;
CREATE POLICY "Users can delete own balance history" ON account_balance_history
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7. RLS Policies for plaid_items
-- ============================================

DROP POLICY IF EXISTS "Users can view own plaid items" ON plaid_items;
CREATE POLICY "Users can view own plaid items" ON plaid_items
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plaid items" ON plaid_items;
CREATE POLICY "Users can insert own plaid items" ON plaid_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own plaid items" ON plaid_items;
CREATE POLICY "Users can update own plaid items" ON plaid_items
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own plaid items" ON plaid_items;
CREATE POLICY "Users can delete own plaid items" ON plaid_items
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE accounts IS 'Financial accounts (bank, credit, investment, etc.) - manual or Plaid-linked';
COMMENT ON TABLE account_balance_history IS 'Immutable balance snapshots for net worth charting';
COMMENT ON TABLE plaid_items IS 'Plaid Link items for future bank connection integration';
COMMENT ON COLUMN plaid_items.plaid_access_token IS 'Encrypt via Supabase Vault in production';
