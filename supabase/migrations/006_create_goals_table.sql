-- Create savings goals table
-- Tracks financial goals with progress and optional deadlines

CREATE TABLE goals (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Goal details
  name TEXT NOT NULL,
  description TEXT,

  -- Financial targets (stored as DECIMAL for precision per CLAUDE.md)
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Timeline
  deadline DATE,                    -- Optional target completion date

  -- Goal classification
  goal_type TEXT NOT NULL CHECK (goal_type IN (
    'emergency_fund',    -- 3-6 months expenses (Priority #1 per waterfall)
    'retirement_401k',   -- Employer 401k contributions
    'retirement_ira',    -- IRA contributions
    'espp',              -- Employee Stock Purchase Plan
    'hsa',               -- Health Savings Account
    'vacation',          -- Travel fund
    'home',              -- Down payment / home purchase
    'car',               -- Vehicle purchase
    'wedding',           -- Wedding expenses
    'education',         -- School / courses
    'debt_payoff',       -- High-interest debt (Priority #3 per waterfall)
    'custom'             -- User-defined goal
  )),

  -- UI display
  icon TEXT NOT NULL DEFAULT 'Target',
  color TEXT NOT NULL DEFAULT '#6366F1',

  -- Ordering and status
  priority INTEGER NOT NULL DEFAULT 0,  -- Lower = higher priority
  is_active BOOLEAN DEFAULT true,

  -- Auto-contribution settings (for paystub-linked goals)
  auto_contribute BOOLEAN DEFAULT false,
  contribution_field TEXT,              -- Links to paystub field: 'traditional_401k', 'espp_contribution', 'hsa_contribution', etc.

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal contributions table
-- Tracks individual contributions to goals (manual or from paystubs)
CREATE TABLE goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to goal
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

  -- Contribution details
  amount DECIMAL(12,2) NOT NULL,
  contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Source tracking
  source TEXT NOT NULL CHECK (source IN ('manual', 'paystub', 'transfer', 'interest')),
  paystub_id UUID REFERENCES paystubs(id) ON DELETE SET NULL,  -- Optional link to paystub

  -- Notes
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_goals_type ON goals(goal_type);
CREATE INDEX idx_goals_active ON goals(is_active);
CREATE INDEX idx_goals_priority ON goals(priority);
CREATE INDEX idx_goal_contributions_goal ON goal_contributions(goal_id);
CREATE INDEX idx_goal_contributions_date ON goal_contributions(contribution_date DESC);
CREATE INDEX idx_goal_contributions_paystub ON goal_contributions(paystub_id);

-- Trigger to auto-update goals.updated_at
CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update goal current_amount when contributions change
CREATE OR REPLACE FUNCTION update_goal_current_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE goals
    SET current_amount = current_amount + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.goal_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE goals
    SET current_amount = current_amount - OLD.amount,
        updated_at = NOW()
    WHERE id = OLD.goal_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.amount != OLD.amount THEN
    UPDATE goals
    SET current_amount = current_amount - OLD.amount + NEW.amount,
        updated_at = NOW()
    WHERE id = NEW.goal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goal_amount_on_contribution
  AFTER INSERT OR UPDATE OR DELETE ON goal_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_current_amount();

-- Insert default goals based on waterfall priority (from CLAUDE.md)
INSERT INTO goals (name, description, target_amount, goal_type, icon, color, priority, auto_contribute, contribution_field) VALUES
  -- Priority 1: Safety Net (3 months expenses)
  ('Emergency Fund', '3 months of expenses in High Yield Savings', 10000, 'emergency_fund', 'Shield', '#10B981', 1, false, NULL),

  -- Priority 2: 401k Match
  ('401k (Employer Match)', 'Maximize employer 401k match', 6000, 'retirement_401k', 'Building2', '#6366F1', 2, true, 'traditional_401k'),

  -- Priority 4: ESPP (if >10% discount)
  ('ESPP', 'Employee Stock Purchase Plan', 5000, 'espp', 'TrendingUp', '#A855F7', 4, true, 'espp_contribution'),

  -- HSA
  ('HSA', 'Health Savings Account', 4150, 'hsa', 'Heart', '#EC4899', 5, true, 'hsa_contribution');

-- Comments
COMMENT ON TABLE goals IS 'Savings goals with progress tracking and optional paystub integration';
COMMENT ON TABLE goal_contributions IS 'Individual contributions to savings goals';
COMMENT ON COLUMN goals.contribution_field IS 'Paystub field name for auto-contributions (e.g., traditional_401k, espp_contribution)';
COMMENT ON COLUMN goals.priority IS 'Based on financial waterfall: 1=Emergency, 2=401k Match, 3=Debt, 4=ESPP, 5+=Custom';
