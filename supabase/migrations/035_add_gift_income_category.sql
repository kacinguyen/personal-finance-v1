-- Migration: Add Gift as an income category for all existing users

INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active, is_budgetable)
SELECT DISTINCT
  user_id,
  'Gift',
  'gift',
  'Gift',
  '#EC4899',
  'income',
  true,
  true,
  false
FROM categories
WHERE user_id IS NOT NULL
ON CONFLICT (user_id, normalized_name) DO NOTHING;
