-- Fix: Change needs_review default to true so new transactions from Plaid sync
-- always require review unless explicitly marked otherwise.
ALTER TABLE transactions ALTER COLUMN needs_review SET DEFAULT true;
