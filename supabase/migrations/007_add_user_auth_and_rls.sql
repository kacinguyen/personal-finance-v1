-- Migration: Add User Authentication and Row-Level Security
-- Adds user_id columns to all tables and enables RLS policies

-- ============================================
-- 1. Add user_id columns to all tables
-- ============================================

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE paystubs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE goal_contributions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- 2. Create indexes for user_id columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_paystubs_user_id ON paystubs(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_contributions_user_id ON goal_contributions(user_id);

-- ============================================
-- 3. Enable Row-Level Security
-- ============================================

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE paystubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_contributions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create RLS Policies for transactions
-- ============================================

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. Create RLS Policies for paystubs
-- ============================================

DROP POLICY IF EXISTS "Users can view own paystubs" ON paystubs;
CREATE POLICY "Users can view own paystubs" ON paystubs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own paystubs" ON paystubs;
CREATE POLICY "Users can insert own paystubs" ON paystubs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own paystubs" ON paystubs;
CREATE POLICY "Users can update own paystubs" ON paystubs
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own paystubs" ON paystubs;
CREATE POLICY "Users can delete own paystubs" ON paystubs
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 6. Create RLS Policies for budgets
-- ============================================

DROP POLICY IF EXISTS "Users can view own budgets" ON budgets;
CREATE POLICY "Users can view own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own budgets" ON budgets;
CREATE POLICY "Users can insert own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own budgets" ON budgets;
CREATE POLICY "Users can update own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own budgets" ON budgets;
CREATE POLICY "Users can delete own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7. Create RLS Policies for goals
-- ============================================

DROP POLICY IF EXISTS "Users can view own goals" ON goals;
CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
CREATE POLICY "Users can insert own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON goals;
CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 8. Create RLS Policies for goal_contributions
-- ============================================

DROP POLICY IF EXISTS "Users can view own goal_contributions" ON goal_contributions;
CREATE POLICY "Users can view own goal_contributions" ON goal_contributions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own goal_contributions" ON goal_contributions;
CREATE POLICY "Users can insert own goal_contributions" ON goal_contributions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own goal_contributions" ON goal_contributions;
CREATE POLICY "Users can update own goal_contributions" ON goal_contributions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own goal_contributions" ON goal_contributions;
CREATE POLICY "Users can delete own goal_contributions" ON goal_contributions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 9. Handle budgets uniqueness constraint
-- ============================================

-- Drop existing unique constraint on category (if exists)
ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_key;

-- Add composite unique constraint for user_id + category
ALTER TABLE budgets ADD CONSTRAINT budgets_user_category_unique UNIQUE (user_id, category);

-- ============================================
-- 10. Create function to seed default budgets for new users
-- ============================================

CREATE OR REPLACE FUNCTION create_default_budgets_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default budget categories for the new user
  INSERT INTO budgets (user_id, category, monthly_limit, budget_type, flexibility, icon, color, is_active)
  VALUES
    (NEW.id, 'Food & Dining', 600, 'need', 'variable', 'Utensils', '#FF6B6B', true),
    (NEW.id, 'Transportation', 400, 'need', 'variable', 'Car', '#38BDF8', true),
    (NEW.id, 'Housing', 2000, 'need', 'fixed', 'Home', '#10B981', true),
    (NEW.id, 'Utilities', 200, 'need', 'variable', 'Zap', '#F59E0B', true),
    (NEW.id, 'Healthcare', 150, 'need', 'variable', 'Heart', '#EC4899', true),
    (NEW.id, 'Entertainment', 200, 'want', 'variable', 'Clapperboard', '#A855F7', true),
    (NEW.id, 'Shopping', 300, 'want', 'variable', 'ShoppingBag', '#6366F1', true);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run the function when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_budgets_for_user();

-- ============================================
-- 11. Clean up existing data without user_id (dev data)
-- ============================================

-- Delete existing rows without user_id
DELETE FROM goal_contributions WHERE user_id IS NULL;
DELETE FROM goals WHERE user_id IS NULL;
DELETE FROM budgets WHERE user_id IS NULL;
DELETE FROM paystubs WHERE user_id IS NULL;
DELETE FROM transactions WHERE user_id IS NULL;

-- ============================================
-- 12. Make user_id NOT NULL after cleanup
-- ============================================

ALTER TABLE transactions ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE paystubs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE budgets ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE goals ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE goal_contributions ALTER COLUMN user_id SET NOT NULL;
