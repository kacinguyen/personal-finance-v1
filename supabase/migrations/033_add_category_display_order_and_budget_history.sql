-- Migration: Add display_order to categories and create budget_months table
-- Supports drag-to-reorder and monthly budget snapshots

-- ============================================
-- 1. Add display_order column to categories
-- ============================================

ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(user_id, display_order);

-- ============================================
-- 2. Create budget_months table for monthly snapshots
-- ============================================

CREATE TABLE IF NOT EXISTS budget_months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  month DATE NOT NULL,  -- first of month, e.g. '2026-02-01'
  monthly_limit DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (budget_id, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_months_user_id ON budget_months(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_months_month ON budget_months(user_id, month);
CREATE INDEX IF NOT EXISTS idx_budget_months_budget_id ON budget_months(budget_id);

-- Auto-update updated_at
CREATE TRIGGER update_budget_months_updated_at
  BEFORE UPDATE ON budget_months
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Enable RLS on budget_months
-- ============================================

ALTER TABLE budget_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own budget_months" ON budget_months
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own budget_months" ON budget_months
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own budget_months" ON budget_months
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget_months" ON budget_months
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. Initialize display_order from alphabetical name order per user
-- ============================================

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY name) * 10 AS new_order
  FROM categories
)
UPDATE categories SET display_order = ordered.new_order
FROM ordered WHERE categories.id = ordered.id;
