-- ============================================================
-- Reset Demo Data Script
-- Deletes all data for the demo user across all tables.
-- Run this before re-running seed-demo-data.sql.
--
-- IMPORTANT: Replace the UUID below with the actual demo user ID
-- ============================================================

DO $$
DECLARE
  demo_uid UUID := 'c79e07e3-a981-4084-b1f6-2c32b9a80677';
BEGIN

  -- Delete in dependency order (children first)
  DELETE FROM goal_contributions WHERE goal_id IN (SELECT id FROM goals WHERE user_id = demo_uid);
  DELETE FROM rsu_vests WHERE user_id = demo_uid;
  DELETE FROM merchant_category_rules WHERE user_id = demo_uid;
  DELETE FROM budget_months WHERE user_id = demo_uid;
  DELETE FROM budgets WHERE user_id = demo_uid;
  DELETE FROM goals WHERE user_id = demo_uid;
  DELETE FROM transaction_splits WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = demo_uid);
  DELETE FROM transactions WHERE user_id = demo_uid;
  DELETE FROM paystubs WHERE user_id = demo_uid;
  DELETE FROM account_balance_history WHERE user_id = demo_uid;
  DELETE FROM accounts WHERE user_id = demo_uid;
  DELETE FROM monthly_summaries WHERE user_id = demo_uid;

  -- Note: Categories are NOT deleted since they were seeded by the app on first login.
  -- If you want a full reset including categories, uncomment:
  -- DELETE FROM categories WHERE user_id = demo_uid;

  RAISE NOTICE 'Demo data reset complete for user %', demo_uid;

END $$;
