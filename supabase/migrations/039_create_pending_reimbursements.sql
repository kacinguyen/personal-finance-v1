-- Migration: Create pending_reimbursements table and supporting changes
-- Tracks shared expenses where others owe the user money back

-- 1. Add amount_modified_by_split flag to transactions
-- Guards against Plaid sync overwriting the user's modified share amount
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS amount_modified_by_split BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Create pending_reimbursements table
CREATE TABLE IF NOT EXISTS pending_reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  original_amount NUMERIC(12, 2) NOT NULL, -- Full amount before split (negative for expenses)
  user_share NUMERIC(12, 2) NOT NULL,      -- User's portion (negative for expenses)
  others_share NUMERIC(12, 2) NOT NULL,    -- Absolute value owed back (positive)
  split_percentage NUMERIC(5, 2),          -- Nullable, for display (e.g. 50.00)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'written_off')),
  resolved_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pending_reimbursements_user_id ON pending_reimbursements(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_reimbursements_transaction_id ON pending_reimbursements(transaction_id);
CREATE INDEX IF NOT EXISTS idx_pending_reimbursements_status ON pending_reimbursements(user_id, status);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER pending_reimbursements_updated_at
  BEFORE UPDATE ON pending_reimbursements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. RLS Policies
ALTER TABLE pending_reimbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pending reimbursements"
  ON pending_reimbursements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pending reimbursements"
  ON pending_reimbursements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending reimbursements"
  ON pending_reimbursements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pending reimbursements"
  ON pending_reimbursements FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Insert "Pending Reimbursement" category for each existing user
-- Uses transfer type so it's excluded from budgets
INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active, is_budgetable, display_order)
SELECT
  u.id,
  'Pending Reimbursement',
  'pending reimbursement',
  'UserCheck',
  '#F59E0B',
  'transfer',
  TRUE,
  TRUE,
  FALSE,
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM categories WHERE categories.user_id = u.id)
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM categories c
  WHERE c.user_id = u.id AND c.normalized_name = 'pending reimbursement'
);
