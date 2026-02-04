-- Migration: Update income categories with budgetable distinction
-- Adds RSU Vest, Reimbursements, Interest, ESPP categories
-- Removes Freelance from defaults (user can add manually)

-- ============================================
-- 1. Add new income categories for existing users
-- ============================================

-- Add RSU Vest category for users who don't have it
INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active, is_budgetable)
SELECT DISTINCT
  user_id,
  'RSU Vest',
  'rsu vest',
  'TrendingUp',
  '#8B5CF6',
  'income',
  true,
  true,
  false
FROM categories
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, normalized_name) DO NOTHING;

-- Add Reimbursements category for users who don't have it
INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active, is_budgetable)
SELECT DISTINCT
  user_id,
  'Reimbursements',
  'reimbursements',
  'Receipt',
  '#14B8A6',
  'income',
  true,
  true,
  false
FROM categories
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, normalized_name) DO NOTHING;

-- Add Interest category for users who don't have it
INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active, is_budgetable)
SELECT DISTINCT
  user_id,
  'Interest',
  'interest',
  'Percent',
  '#10B981',
  'income',
  true,
  true,
  false
FROM categories
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, normalized_name) DO NOTHING;

-- Add ESPP category for users who don't have it
INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active, is_budgetable)
SELECT DISTINCT
  user_id,
  'ESPP',
  'espp',
  'Building2',
  '#6366F1',
  'income',
  true,
  true,
  false
FROM categories
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, normalized_name) DO NOTHING;

-- ============================================
-- 2. Ensure existing Bonus categories have is_budgetable = false
-- ============================================

UPDATE categories
SET is_budgetable = false
WHERE normalized_name = 'bonus' AND category_type = 'income';

-- ============================================
-- 3. Update create_default_data_for_user() function
-- ============================================

CREATE OR REPLACE FUNCTION create_default_data_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default categories for the new user
  INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active, is_budgetable)
  VALUES
    -- Needs
    (NEW.id, 'Rent', 'rent', 'Home', '#6366F1', 'need', true, true, false),
    (NEW.id, 'Utilities', 'utilities', 'Zap', '#F59E0B', 'need', true, true, false),
    (NEW.id, 'Groceries', 'groceries', 'ShoppingCart', '#10B981', 'need', true, true, false),
    (NEW.id, 'Transportation', 'transportation', 'Car', '#38BDF8', 'need', true, true, false),
    (NEW.id, 'Insurance', 'insurance', 'Shield', '#6366F1', 'need', true, true, false),
    (NEW.id, 'Healthcare', 'healthcare', 'Heart', '#EC4899', 'need', true, true, false),
    -- Wants
    (NEW.id, 'Dining Out', 'dining out', 'Utensils', '#FF6B6B', 'want', true, true, false),
    (NEW.id, 'Entertainment', 'entertainment', 'Clapperboard', '#8B5CF6', 'want', true, true, false),
    (NEW.id, 'Shopping - General', 'shopping - general', 'ShoppingBag', '#A855F7', 'want', true, true, false),
    (NEW.id, 'Shopping - Clothing', 'shopping - clothing', 'Shirt', '#A855F7', 'want', true, true, false),
    (NEW.id, 'Subscriptions', 'subscriptions', 'CreditCard', '#14B8A6', 'want', true, true, false),
    (NEW.id, 'Travel', 'travel', 'Plane', '#F59E0B', 'want', true, true, false),
    (NEW.id, 'Fitness', 'fitness', 'Dumbbell', '#EF4444', 'want', true, true, false),
    (NEW.id, 'Self Care', 'self care', 'Scissors', '#EC4899', 'want', true, true, false),
    -- Income (Budgetable)
    (NEW.id, 'Salary', 'salary', 'Wallet', '#10B981', 'income', true, true, true),
    -- Income (Windfall)
    (NEW.id, 'Bonus', 'bonus', 'Gift', '#F59E0B', 'income', true, true, false),
    (NEW.id, 'RSU Vest', 'rsu vest', 'TrendingUp', '#8B5CF6', 'income', true, true, false),
    (NEW.id, 'Reimbursements', 'reimbursements', 'Receipt', '#14B8A6', 'income', true, true, false),
    (NEW.id, 'Interest', 'interest', 'Percent', '#10B981', 'income', true, true, false),
    (NEW.id, 'ESPP', 'espp', 'Building2', '#6366F1', 'income', true, true, false),
    -- Transfer
    (NEW.id, 'Bank Transfer', 'bank transfer', 'ArrowLeftRight', '#6B7280', 'transfer', true, true, false),
    (NEW.id, 'Savings', 'savings', 'PiggyBank', '#10B981', 'transfer', true, true, false);

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

-- ============================================
-- 4. Comments
-- ============================================

COMMENT ON FUNCTION create_default_data_for_user() IS 'Seeds default categories (with budgetable income distinction) and budgets when a new user signs up';
