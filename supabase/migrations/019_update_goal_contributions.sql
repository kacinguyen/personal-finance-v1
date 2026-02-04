-- Update goal_contributions table to support RSU and ESPP sources
-- Adds new source types and rsu_vest_id reference

-- First, drop the existing constraint on source
ALTER TABLE goal_contributions DROP CONSTRAINT IF EXISTS goal_contributions_source_check;

-- Add new source constraint with additional types
ALTER TABLE goal_contributions ADD CONSTRAINT goal_contributions_source_check
  CHECK (source IN ('manual', 'paystub', 'transfer', 'interest', 'rsu_vest', 'espp_purchase'));

-- Add rsu_vest_id column to link contributions to RSU vests
ALTER TABLE goal_contributions ADD COLUMN rsu_vest_id UUID REFERENCES rsu_vests(id) ON DELETE SET NULL;

-- Add index for rsu_vest_id lookups
CREATE INDEX idx_goal_contributions_rsu_vest ON goal_contributions(rsu_vest_id);

-- Comments
COMMENT ON COLUMN goal_contributions.rsu_vest_id IS 'Links to rsu_vests table when source is rsu_vest';
