-- Add goal_id column to transactions table for linking transactions to savings goals
ALTER TABLE transactions ADD COLUMN goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

-- Create index for efficient lookups by goal_id
CREATE INDEX idx_transactions_goal_id ON transactions(goal_id) WHERE goal_id IS NOT NULL;
