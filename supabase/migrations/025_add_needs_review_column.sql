ALTER TABLE transactions
  ADD COLUMN needs_review BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_transactions_needs_review
  ON transactions(needs_review) WHERE needs_review = true;
