-- Migration: Populate categories from existing data
-- Extracts categories from budgets, links transactions, and sets up default categories trigger

-- ============================================
-- 1. Extract categories from existing budgets
-- ============================================

-- Insert categories from existing budgets (with icon/color from budgets)
INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active)
SELECT DISTINCT
  b.user_id,
  b.category,
  LOWER(b.category),
  b.icon,
  b.color,
  b.budget_type,  -- 'need' or 'want' maps directly
  true,  -- Mark as system category
  true
FROM budgets b
WHERE b.user_id IS NOT NULL
ON CONFLICT (user_id, normalized_name) DO NOTHING;

-- ============================================
-- 2. Populate category_id on budgets
-- ============================================

UPDATE budgets b
SET category_id = c.id
FROM categories c
WHERE b.user_id = c.user_id
  AND LOWER(b.category) = c.normalized_name
  AND b.category_id IS NULL;

-- ============================================
-- 3. Populate category_id on transactions
-- ============================================

UPDATE transactions t
SET category_id = c.id
FROM categories c
WHERE t.user_id = c.user_id
  AND LOWER(t.category) = c.normalized_name
  AND t.category_id IS NULL
  AND t.category IS NOT NULL;

-- ============================================
-- 4. Create categories for transactions that don't match existing budgets
-- ============================================

-- Insert unique transaction categories that don't have a matching category
INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active)
SELECT DISTINCT
  t.user_id,
  t.category,
  LOWER(t.category),
  'CircleDollarSign',  -- Default icon
  '#6B7280',           -- Default color (gray)
  'want',              -- Default to 'want' since unknown
  false,
  true
FROM transactions t
WHERE t.user_id IS NOT NULL
  AND t.category IS NOT NULL
  AND t.category_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM categories c
    WHERE c.user_id = t.user_id
      AND c.normalized_name = LOWER(t.category)
  )
ON CONFLICT (user_id, normalized_name) DO NOTHING;

-- Update transactions again after inserting new categories
UPDATE transactions t
SET category_id = c.id
FROM categories c
WHERE t.user_id = c.user_id
  AND LOWER(t.category) = c.normalized_name
  AND t.category_id IS NULL
  AND t.category IS NOT NULL;

-- ============================================
-- 5. Update default budgets trigger to also create categories
-- ============================================

-- Drop existing trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new function that seeds both categories and budgets
CREATE OR REPLACE FUNCTION create_default_data_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default categories for the new user
  INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active)
  VALUES
    -- Needs
    (NEW.id, 'Rent', 'rent', 'Home', '#6366F1', 'need', true, true),
    (NEW.id, 'Utilities', 'utilities', 'Zap', '#F59E0B', 'need', true, true),
    (NEW.id, 'Groceries', 'groceries', 'ShoppingCart', '#10B981', 'need', true, true),
    (NEW.id, 'Transportation', 'transportation', 'Car', '#38BDF8', 'need', true, true),
    (NEW.id, 'Insurance', 'insurance', 'Shield', '#6366F1', 'need', true, true),
    (NEW.id, 'Healthcare', 'healthcare', 'Heart', '#EC4899', 'need', true, true),
    -- Wants
    (NEW.id, 'Dining Out', 'dining out', 'Utensils', '#FF6B6B', 'want', true, true),
    (NEW.id, 'Entertainment', 'entertainment', 'Clapperboard', '#8B5CF6', 'want', true, true),
    (NEW.id, 'Shopping - General', 'shopping - general', 'ShoppingBag', '#A855F7', 'want', true, true),
    (NEW.id, 'Shopping - Clothing', 'shopping - clothing', 'Shirt', '#A855F7', 'want', true, true),
    (NEW.id, 'Subscriptions', 'subscriptions', 'CreditCard', '#14B8A6', 'want', true, true),
    (NEW.id, 'Travel', 'travel', 'Plane', '#F59E0B', 'want', true, true),
    (NEW.id, 'Fitness', 'fitness', 'Dumbbell', '#EF4444', 'want', true, true),
    (NEW.id, 'Self Care', 'self care', 'Scissors', '#EC4899', 'want', true, true),
    -- Income
    (NEW.id, 'Salary', 'salary', 'Wallet', '#10B981', 'income', true, true),
    (NEW.id, 'Bonus', 'bonus', 'Gift', '#F59E0B', 'income', true, true),
    (NEW.id, 'Freelance', 'freelance', 'Briefcase', '#6366F1', 'income', true, true),
    -- Transfer
    (NEW.id, 'Bank Transfer', 'bank transfer', 'ArrowLeftRight', '#6B7280', 'transfer', true, true),
    (NEW.id, 'Savings', 'savings', 'PiggyBank', '#10B981', 'transfer', true, true);

  -- Insert default budgets linked to categories
  INSERT INTO budgets (user_id, category, monthly_limit, budget_type, flexibility, icon, color, is_active, category_id)
  SELECT
    NEW.id,
    c.name,
    CASE c.name
      WHEN 'Rent' THEN 2000
      WHEN 'Utilities' THEN 200
      WHEN 'Groceries' THEN 600
      WHEN 'Transportation' THEN 400
      WHEN 'Insurance' THEN 200
      WHEN 'Healthcare' THEN 150
      WHEN 'Dining Out' THEN 300
      WHEN 'Entertainment' THEN 200
      WHEN 'Shopping - General' THEN 300
      WHEN 'Subscriptions' THEN 100
      WHEN 'Travel' THEN 200
      WHEN 'Fitness' THEN 100
      ELSE 0
    END,
    CASE WHEN c.category_type IN ('need') THEN 'need' ELSE 'want' END,
    CASE c.name
      WHEN 'Rent' THEN 'fixed'
      WHEN 'Insurance' THEN 'fixed'
      WHEN 'Subscriptions' THEN 'fixed'
      WHEN 'Fitness' THEN 'fixed'
      ELSE 'variable'
    END,
    c.icon,
    c.color,
    true,
    c.id
  FROM categories c
  WHERE c.user_id = NEW.id
    AND c.category_type IN ('need', 'want')
    AND c.name NOT IN ('Shopping - Clothing', 'Self Care');  -- Skip some categories for cleaner default

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to run the function when a new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_data_for_user();

-- ============================================
-- 6. Comments
-- ============================================

COMMENT ON FUNCTION create_default_data_for_user() IS 'Seeds default categories and budgets when a new user signs up';
