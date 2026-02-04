-- Create RSU vests table
-- Tracks RSU vest events with computed gross/net values

CREATE TABLE rsu_vests (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User ownership
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Vest details
  vest_date DATE NOT NULL,
  shares_vested DECIMAL(12,4) NOT NULL,
  vest_price DECIMAL(12,4) NOT NULL,

  -- Computed values (stored for query performance)
  total_gross_value DECIMAL(12,2) GENERATED ALWAYS AS (shares_vested * vest_price) STORED,

  -- Sell-to-cover details (optional)
  sell_to_cover_shares DECIMAL(12,4) DEFAULT 0,
  sell_to_cover_value DECIMAL(12,2) DEFAULT 0,

  -- Net value after sell-to-cover
  net_value DECIMAL(12,2) GENERATED ALWAYS AS ((shares_vested * vest_price) - sell_to_cover_value) STORED,

  -- Link to goal contribution (if allocated to a goal)
  goal_contribution_id UUID REFERENCES goal_contributions(id) ON DELETE SET NULL,

  -- Additional info
  company_name TEXT,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rsu_vests_user ON rsu_vests(user_id);
CREATE INDEX idx_rsu_vests_date ON rsu_vests(vest_date DESC);
CREATE INDEX idx_rsu_vests_goal_contribution ON rsu_vests(goal_contribution_id);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_rsu_vests_updated_at
  BEFORE UPDATE ON rsu_vests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE rsu_vests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own RSU vests
CREATE POLICY "Users can view own RSU vests"
  ON rsu_vests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own RSU vests"
  ON rsu_vests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own RSU vests"
  ON rsu_vests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own RSU vests"
  ON rsu_vests FOR DELETE
  USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE rsu_vests IS 'Tracks RSU vest events with auto-calculated gross/net values';
COMMENT ON COLUMN rsu_vests.total_gross_value IS 'Computed: shares_vested * vest_price';
COMMENT ON COLUMN rsu_vests.net_value IS 'Computed: total_gross_value - sell_to_cover_value';
COMMENT ON COLUMN rsu_vests.goal_contribution_id IS 'Links to goal_contribution if this vest was allocated to a savings goal';
