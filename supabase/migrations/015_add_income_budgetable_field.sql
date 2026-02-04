-- Migration: Add is_budgetable field to categories
-- Distinguishes budgetable income (Salary) from windfall income (Bonus, RSU, etc.)

-- ============================================
-- 1. Add is_budgetable column
-- ============================================

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS is_budgetable BOOLEAN DEFAULT false;

-- ============================================
-- 2. Set is_budgetable = true for Salary categories
-- ============================================

UPDATE categories
SET is_budgetable = true
WHERE normalized_name = 'salary' AND category_type = 'income';

-- ============================================
-- 3. Add index for query performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_categories_is_budgetable ON categories(is_budgetable);

-- ============================================
-- 4. Add comment for documentation
-- ============================================

COMMENT ON COLUMN categories.is_budgetable IS 'Only true for budgetable income (Salary). Windfall income (Bonus, RSU, ESPP, etc.) has is_budgetable = false.';
