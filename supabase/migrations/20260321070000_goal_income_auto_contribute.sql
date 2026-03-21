-- Migration: Add income-based auto-contribution linking
-- Goals can be linked to income categories (Salary, RSU, ESPP, etc.) with a percentage
-- so that when matching income transactions are imported, a portion auto-contributes to the goal.

-- ============================================
-- 1. Create goal_income_links table
-- ============================================

CREATE TABLE goal_income_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00 CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(goal_id, category_id)
);

CREATE INDEX idx_goal_income_links_goal ON goal_income_links(goal_id);
CREATE INDEX idx_goal_income_links_category ON goal_income_links(category_id);
CREATE INDEX idx_goal_income_links_user ON goal_income_links(user_id);

-- RLS
ALTER TABLE goal_income_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goal_income_links" ON goal_income_links
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goal_income_links" ON goal_income_links
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goal_income_links" ON goal_income_links
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goal_income_links" ON goal_income_links
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_goal_income_links_updated_at
  BEFORE UPDATE ON goal_income_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE goal_income_links IS 'Links savings goals to income categories with a percentage for auto-contributions from imported transactions';
COMMENT ON COLUMN goal_income_links.percentage IS 'Percentage of matching income transaction to contribute (e.g., 10 = 10%)';
