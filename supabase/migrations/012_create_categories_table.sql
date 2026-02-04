-- Migration: Create categories table
-- Decouples categories from budgets to enable:
-- 1. Transactions to reference categories via FK
-- 2. Budgets to reference categories via FK
-- 3. Categories to exist independently of budgets
-- 4. Single source of truth for icons/colors

-- ============================================
-- 1. Create categories table
-- ============================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,  -- Lowercase for case-insensitive matching
  icon TEXT NOT NULL DEFAULT 'CircleDollarSign',
  color TEXT NOT NULL DEFAULT '#6B7280',
  category_type TEXT NOT NULL DEFAULT 'want' CHECK (category_type IN ('need', 'want', 'income', 'transfer')),
  is_system BOOLEAN DEFAULT false,  -- System categories can't be deleted
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, normalized_name)
);

-- ============================================
-- 2. Create indexes
-- ============================================

CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_normalized_name ON categories(normalized_name);
CREATE INDEX idx_categories_type ON categories(category_type);
CREATE INDEX idx_categories_active ON categories(is_active);

-- ============================================
-- 3. Create updated_at trigger
-- ============================================

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Enable Row-Level Security
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Create RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Users can view own categories" ON categories;
CREATE POLICY "Users can view own categories" ON categories
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
CREATE POLICY "Users can insert own categories" ON categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own categories" ON categories;
CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own categories" ON categories;
CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- ============================================
-- 6. Add category_id FK columns to budgets and transactions
-- ============================================

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_budgets_category_id ON budgets(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON transactions(category_id);

-- ============================================
-- 7. Comments for documentation
-- ============================================

COMMENT ON TABLE categories IS 'Master categories table for budgets and transactions';
COMMENT ON COLUMN categories.normalized_name IS 'Lowercase name for case-insensitive matching';
COMMENT ON COLUMN categories.category_type IS 'Classification: need, want, income, or transfer';
COMMENT ON COLUMN categories.is_system IS 'System categories cannot be deleted by users';
