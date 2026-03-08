-- Link goal contributions to transactions and track partial contribution amounts
-- When a user tags a transaction with a goal, they can specify a partial amount
-- that creates a real goal_contribution record (updating goals.current_amount via trigger)

-- Add contribution amount to transactions (how much of this transaction goes to the goal)
ALTER TABLE transactions ADD COLUMN goal_contribution_amount DECIMAL(12,2);

-- Add transaction_id to goal_contributions for reverse lookup
ALTER TABLE goal_contributions ADD COLUMN transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE;

-- Index for finding contributions by transaction
CREATE INDEX idx_goal_contributions_transaction ON goal_contributions(transaction_id) WHERE transaction_id IS NOT NULL;

-- Ensure one contribution per transaction (a transaction can only contribute to one goal at a time)
CREATE UNIQUE INDEX idx_goal_contributions_transaction_unique ON goal_contributions(transaction_id) WHERE transaction_id IS NOT NULL;

COMMENT ON COLUMN transactions.goal_contribution_amount IS 'Partial amount of this transaction allocated to the linked goal';
COMMENT ON COLUMN goal_contributions.transaction_id IS 'Links to transaction when contribution originates from transaction tagging';
