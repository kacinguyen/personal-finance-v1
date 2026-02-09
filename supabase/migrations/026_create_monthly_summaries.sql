-- Migration: Create monthly summary tables and refresh function
-- Pre-aggregated monthly data for dashboard views and AI/intelligence queries

-- ============================================
-- 1. Create monthly_summaries table
-- ============================================

CREATE TABLE monthly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- Always first of month (e.g. 2025-01-01)

  -- Income
  total_income DECIMAL(12,2) NOT NULL DEFAULT 0,
  salary_income DECIMAL(12,2) NOT NULL DEFAULT 0,
  other_income DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Spending (absolute values)
  total_spending DECIMAL(12,2) NOT NULL DEFAULT 0,
  needs_spending DECIMAL(12,2) NOT NULL DEFAULT 0,
  wants_spending DECIMAL(12,2) NOT NULL DEFAULT 0,
  transfers_total DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Derived
  net_savings DECIMAL(12,2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,

  -- Budget snapshots
  total_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  needs_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  wants_budget DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Paystub aggregates
  paystub_gross DECIMAL(12,2) NOT NULL DEFAULT 0,
  paystub_net DECIMAL(12,2) NOT NULL DEFAULT 0,
  paystub_401k DECIMAL(12,2) NOT NULL DEFAULT 0,
  paystub_employer_match DECIMAL(12,2) NOT NULL DEFAULT 0,
  paystub_hsa DECIMAL(12,2) NOT NULL DEFAULT 0,
  paystub_espp DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Net worth snapshot
  net_worth DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_assets DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_liabilities DECIMAL(14,2) NOT NULL DEFAULT 0,

  -- Metadata
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, month)
);

-- Indexes
CREATE INDEX idx_monthly_summaries_user_month ON monthly_summaries(user_id, month);

-- ============================================
-- 2. Create monthly_category_summaries table
-- ============================================

CREATE TABLE monthly_category_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  category_type TEXT NOT NULL, -- Denormalized: need/want/income/transfer
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  transaction_count INTEGER NOT NULL DEFAULT 0,
  budget_amount DECIMAL(12,2), -- NULL if no budget for this category
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (user_id, month, category_id)
);

-- Indexes
CREATE INDEX idx_monthly_cat_summaries_user_month ON monthly_category_summaries(user_id, month);
CREATE INDEX idx_monthly_cat_summaries_category ON monthly_category_summaries(category_id);

-- ============================================
-- 3. Enable Row-Level Security
-- ============================================

ALTER TABLE monthly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_category_summaries ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies for monthly_summaries
-- ============================================

CREATE POLICY "Users can view own monthly summaries" ON monthly_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly summaries" ON monthly_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly summaries" ON monthly_summaries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly summaries" ON monthly_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. RLS Policies for monthly_category_summaries
-- ============================================

CREATE POLICY "Users can view own monthly category summaries" ON monthly_category_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly category summaries" ON monthly_category_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly category summaries" ON monthly_category_summaries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly category summaries" ON monthly_category_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 6. Create refresh_monthly_summary function
-- ============================================

CREATE OR REPLACE FUNCTION refresh_monthly_summary(p_user_id UUID, p_month DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month_start DATE;
  v_month_end DATE;
  v_total_income DECIMAL(12,2) := 0;
  v_salary_income DECIMAL(12,2) := 0;
  v_other_income DECIMAL(12,2) := 0;
  v_total_spending DECIMAL(12,2) := 0;
  v_needs_spending DECIMAL(12,2) := 0;
  v_wants_spending DECIMAL(12,2) := 0;
  v_transfers_total DECIMAL(12,2) := 0;
  v_transaction_count INTEGER := 0;
  v_total_budget DECIMAL(12,2) := 0;
  v_needs_budget DECIMAL(12,2) := 0;
  v_wants_budget DECIMAL(12,2) := 0;
  v_paystub_gross DECIMAL(12,2) := 0;
  v_paystub_net DECIMAL(12,2) := 0;
  v_paystub_401k DECIMAL(12,2) := 0;
  v_paystub_employer_match DECIMAL(12,2) := 0;
  v_paystub_hsa DECIMAL(12,2) := 0;
  v_paystub_espp DECIMAL(12,2) := 0;
  v_net_worth DECIMAL(14,2) := 0;
  v_total_assets DECIMAL(14,2) := 0;
  v_total_liabilities DECIMAL(14,2) := 0;
BEGIN
  -- Normalize month to first of month
  v_month_start := date_trunc('month', p_month)::DATE;
  v_month_end := (v_month_start + INTERVAL '1 month')::DATE;

  -- ========================================
  -- Transaction aggregates
  -- ========================================
  -- Income: positive amounts with category_type = 'income'
  SELECT
    COALESCE(SUM(t.amount), 0),
    COALESCE(SUM(CASE WHEN c.normalized_name = 'salary' THEN t.amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.normalized_name != 'salary' THEN t.amount ELSE 0 END), 0)
  INTO v_total_income, v_salary_income, v_other_income
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = p_user_id
    AND t.date >= v_month_start
    AND t.date < v_month_end
    AND c.category_type = 'income';

  -- Spending: need + want categories (store as absolute values)
  SELECT
    COALESCE(SUM(ABS(t.amount)), 0),
    COALESCE(SUM(CASE WHEN c.category_type = 'need' THEN ABS(t.amount) ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN c.category_type = 'want' THEN ABS(t.amount) ELSE 0 END), 0)
  INTO v_total_spending, v_needs_spending, v_wants_spending
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = p_user_id
    AND t.date >= v_month_start
    AND t.date < v_month_end
    AND c.category_type IN ('need', 'want');

  -- Transfers
  SELECT COALESCE(SUM(ABS(t.amount)), 0)
  INTO v_transfers_total
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = p_user_id
    AND t.date >= v_month_start
    AND t.date < v_month_end
    AND c.category_type = 'transfer';

  -- Transaction count (non-transfer)
  SELECT COUNT(*)
  INTO v_transaction_count
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.user_id = p_user_id
    AND t.date >= v_month_start
    AND t.date < v_month_end
    AND (c.category_type IS NULL OR c.category_type != 'transfer');

  -- ========================================
  -- Budget snapshots
  -- ========================================
  SELECT
    COALESCE(SUM(monthly_limit), 0),
    COALESCE(SUM(CASE WHEN budget_type = 'need' THEN monthly_limit ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN budget_type = 'want' THEN monthly_limit ELSE 0 END), 0)
  INTO v_total_budget, v_needs_budget, v_wants_budget
  FROM budgets
  WHERE user_id = p_user_id
    AND is_active = true;

  -- ========================================
  -- Paystub aggregates
  -- ========================================
  SELECT
    COALESCE(SUM(gross_pay), 0),
    COALESCE(SUM(net_pay), 0),
    COALESCE(SUM(COALESCE(traditional_401k, 0) + COALESCE(roth_401k, 0) + COALESCE(after_tax_401k, 0)), 0),
    COALESCE(SUM(COALESCE(employer_401k_match, 0)), 0),
    COALESCE(SUM(COALESCE(hsa_contribution, 0)), 0),
    COALESCE(SUM(COALESCE(espp_contribution, 0)), 0)
  INTO v_paystub_gross, v_paystub_net, v_paystub_401k, v_paystub_employer_match, v_paystub_hsa, v_paystub_espp
  FROM paystubs
  WHERE user_id = p_user_id
    AND pay_date >= v_month_start
    AND pay_date < v_month_end;

  -- ========================================
  -- Net worth snapshot (latest balance per account as of month end)
  -- ========================================
  SELECT
    COALESCE(SUM(CASE WHEN a.account_type IN ('checking', 'savings', 'investment', 'retirement_401k', 'retirement_ira') THEN latest.balance ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN a.account_type IN ('credit_card', 'loan', 'mortgage') THEN ABS(latest.balance) ELSE 0 END), 0)
  INTO v_total_assets, v_total_liabilities
  FROM accounts a
  INNER JOIN LATERAL (
    SELECT balance
    FROM account_balance_history bh
    WHERE bh.account_id = a.id
      AND bh.recorded_at < v_month_end + INTERVAL '1 day'
    ORDER BY bh.recorded_at DESC
    LIMIT 1
  ) latest ON true
  WHERE a.user_id = p_user_id
    AND a.is_active = true;

  v_net_worth := v_total_assets - v_total_liabilities;

  -- ========================================
  -- Upsert monthly_summaries
  -- ========================================
  INSERT INTO monthly_summaries (
    user_id, month,
    total_income, salary_income, other_income,
    total_spending, needs_spending, wants_spending, transfers_total,
    net_savings, transaction_count,
    total_budget, needs_budget, wants_budget,
    paystub_gross, paystub_net, paystub_401k, paystub_employer_match, paystub_hsa, paystub_espp,
    net_worth, total_assets, total_liabilities,
    computed_at
  ) VALUES (
    p_user_id, v_month_start,
    v_total_income, v_salary_income, v_other_income,
    v_total_spending, v_needs_spending, v_wants_spending, v_transfers_total,
    v_total_income - v_total_spending, v_transaction_count,
    v_total_budget, v_needs_budget, v_wants_budget,
    v_paystub_gross, v_paystub_net, v_paystub_401k, v_paystub_employer_match, v_paystub_hsa, v_paystub_espp,
    v_net_worth, v_total_assets, v_total_liabilities,
    NOW()
  )
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    total_income = EXCLUDED.total_income,
    salary_income = EXCLUDED.salary_income,
    other_income = EXCLUDED.other_income,
    total_spending = EXCLUDED.total_spending,
    needs_spending = EXCLUDED.needs_spending,
    wants_spending = EXCLUDED.wants_spending,
    transfers_total = EXCLUDED.transfers_total,
    net_savings = EXCLUDED.net_savings,
    transaction_count = EXCLUDED.transaction_count,
    total_budget = EXCLUDED.total_budget,
    needs_budget = EXCLUDED.needs_budget,
    wants_budget = EXCLUDED.wants_budget,
    paystub_gross = EXCLUDED.paystub_gross,
    paystub_net = EXCLUDED.paystub_net,
    paystub_401k = EXCLUDED.paystub_401k,
    paystub_employer_match = EXCLUDED.paystub_employer_match,
    paystub_hsa = EXCLUDED.paystub_hsa,
    paystub_espp = EXCLUDED.paystub_espp,
    net_worth = EXCLUDED.net_worth,
    total_assets = EXCLUDED.total_assets,
    total_liabilities = EXCLUDED.total_liabilities,
    computed_at = EXCLUDED.computed_at;

  -- ========================================
  -- Upsert monthly_category_summaries
  -- ========================================
  -- Delete existing rows for this user/month, then insert fresh
  -- (simpler than per-category upsert and still atomic within this function)
  DELETE FROM monthly_category_summaries
  WHERE user_id = p_user_id AND month = v_month_start;

  INSERT INTO monthly_category_summaries (
    user_id, month, category_id, category_type,
    total_amount, transaction_count, budget_amount,
    computed_at
  )
  SELECT
    p_user_id,
    v_month_start,
    c.id AS category_id,
    c.category_type,
    COALESCE(SUM(ABS(t.amount)), 0) AS total_amount,
    COUNT(t.id) AS transaction_count,
    b.monthly_limit AS budget_amount,
    NOW()
  FROM categories c
  INNER JOIN transactions t
    ON t.category_id = c.id
    AND t.user_id = p_user_id
    AND t.date >= v_month_start
    AND t.date < v_month_end
  LEFT JOIN budgets b
    ON b.category_id = c.id
    AND b.user_id = p_user_id
    AND b.is_active = true
  WHERE c.user_id = p_user_id
  GROUP BY c.id, c.category_type, b.monthly_limit;

END;
$$;

-- ============================================
-- 7. Comments
-- ============================================

COMMENT ON TABLE monthly_summaries IS 'Pre-aggregated monthly financial summaries per user for fast dashboard queries';
COMMENT ON TABLE monthly_category_summaries IS 'Per-category monthly spending/income breakdown for budget views';
COMMENT ON FUNCTION refresh_monthly_summary(UUID, DATE) IS 'Recalculates both monthly summary tables for a given user and month. Idempotent (upsert).';
