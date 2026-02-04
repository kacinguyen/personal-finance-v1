-- Add monthly_budget column to goals table
-- Allows users to set a custom monthly allocation for each savings goal

ALTER TABLE goals
ADD COLUMN monthly_budget DECIMAL(12,2) DEFAULT NULL;

COMMENT ON COLUMN goals.monthly_budget IS 'User-defined monthly budget allocation for this goal. If NULL, calculated from deadline.';
