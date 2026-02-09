-- Migration: Backfill category_id from category text
-- Resolves category_id for transactions where Plaid set category text but left category_id NULL.

-- ============================================
-- 1. Match category text to categories.normalized_name
-- ============================================

UPDATE transactions t
SET category_id = c.id
FROM categories c
WHERE t.category_id IS NULL
  AND t.category IS NOT NULL
  AND t.user_id = c.user_id
  AND lower(trim(t.category)) = c.normalized_name;

-- ============================================
-- 2. Auto-clear needs_review for newly matched transactions
-- ============================================

UPDATE transactions
SET needs_review = false
WHERE category_id IS NOT NULL
  AND needs_review = true;
