-- Migration: Ensure Salary exists as an income category for all users
-- Fixes existing users who may have Salary with wrong category_type or missing entirely

-- ============================================
-- 1. Fix existing Salary categories with wrong category_type
-- ============================================

UPDATE categories
SET category_type = 'income',
    is_budgetable = true,
    icon = 'Wallet',
    color = '#10B981'
WHERE normalized_name = 'salary'
  AND category_type != 'income';

-- ============================================
-- 2. Add Salary for users who don't have it
-- ============================================

INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active, is_budgetable)
SELECT DISTINCT
  user_id,
  'Salary',
  'salary',
  'Wallet',
  '#10B981',
  'income',
  true,
  true,
  true
FROM categories
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, normalized_name) DO NOTHING;
