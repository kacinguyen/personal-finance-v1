-- ============================================
-- Wipe 2024-2025 transactions & paystubs
-- Run via: Supabase SQL Editor or psql
-- ============================================
-- Keeps: 2026+ data, accounts, balances, goals, categories
-- Deletes: transactions, paystubs, monthly summaries for pre-2026

BEGIN;

-- 1. Disable monthly summary triggers to avoid redundant refreshes during bulk delete
ALTER TABLE transactions DISABLE TRIGGER refresh_monthly_summary_on_transaction;
ALTER TABLE paystubs DISABLE TRIGGER refresh_monthly_summary_on_paystub;

-- 2. Delete transactions before 2026 (transaction_splits cascade-deleted automatically)
DELETE FROM transactions WHERE date < '2026-01-01';

-- 3. Delete paystubs before 2026 (goal_contributions.paystub_id set to NULL via ON DELETE SET NULL)
DELETE FROM paystubs WHERE pay_date < '2026-01-01';

-- 4. Delete stale monthly summaries for pre-2026 months
DELETE FROM monthly_category_summaries WHERE month < '2026-01-01';
DELETE FROM monthly_summaries WHERE month < '2026-01-01';

-- 5. Re-enable triggers
ALTER TABLE transactions ENABLE TRIGGER refresh_monthly_summary_on_transaction;
ALTER TABLE paystubs ENABLE TRIGGER refresh_monthly_summary_on_paystub;

COMMIT;

-- 6. Verify: all counts should be 0
SELECT 'transactions' AS table_name, count(*) AS remaining FROM transactions WHERE date < '2026-01-01'
UNION ALL
SELECT 'paystubs', count(*) FROM paystubs WHERE pay_date < '2026-01-01'
UNION ALL
SELECT 'monthly_summaries', count(*) FROM monthly_summaries WHERE month < '2026-01-01'
UNION ALL
SELECT 'monthly_category_summaries', count(*) FROM monthly_category_summaries WHERE month < '2026-01-01';

-- 7. Verify: 2026 data untouched
SELECT 'transactions_2026+' AS check_name, count(*) AS count FROM transactions WHERE date >= '2026-01-01'
UNION ALL
SELECT 'paystubs_2026+', count(*) FROM paystubs WHERE pay_date >= '2026-01-01';
