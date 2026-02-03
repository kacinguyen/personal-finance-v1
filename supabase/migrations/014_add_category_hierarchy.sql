-- Migration: Add hierarchical categories support
-- Adds parent_id to enable category nesting (e.g., Home > Rent, Utilities)

-- ============================================
-- 1. Add parent_id column for hierarchy
-- ============================================

ALTER TABLE categories
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(id) ON DELETE CASCADE;

-- Index for efficient hierarchy queries
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- ============================================
-- 2. Add comment for documentation
-- ============================================

COMMENT ON COLUMN categories.parent_id IS 'Reference to parent category for hierarchical structure. NULL for top-level categories.';
