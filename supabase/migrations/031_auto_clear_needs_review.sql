-- Migration: Auto-clear needs_review when category_id is set
-- Trigger fires on UPDATE to transactions, clears needs_review flag
-- when category_id transitions from NULL to a non-null value.

-- ============================================
-- 1. Create trigger function
-- ============================================

CREATE OR REPLACE FUNCTION auto_clear_needs_review()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- When category_id changes from NULL to non-null, clear needs_review
  IF OLD.category_id IS NULL AND NEW.category_id IS NOT NULL THEN
    NEW.needs_review := false;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- 2. Create BEFORE UPDATE trigger
-- ============================================

CREATE TRIGGER trg_auto_clear_needs_review
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_clear_needs_review();

-- ============================================
-- 3. Comments
-- ============================================

COMMENT ON FUNCTION auto_clear_needs_review() IS 'Automatically clears needs_review flag when a transaction gets a category_id assigned';
