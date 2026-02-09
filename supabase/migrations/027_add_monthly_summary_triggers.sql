-- Auto-refresh monthly_summaries when source data changes
-- Triggers on: transactions, paystubs, account_balance_history

-- ============================================
-- 1. Trigger function for transactions
-- ============================================

CREATE OR REPLACE FUNCTION trigger_refresh_summary_on_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM refresh_monthly_summary(NEW.user_id, date_trunc('month', NEW.date)::DATE);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM refresh_monthly_summary(OLD.user_id, date_trunc('month', OLD.date)::DATE);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM refresh_monthly_summary(NEW.user_id, date_trunc('month', NEW.date)::DATE);
    -- If the date crossed a month boundary, also refresh the old month
    IF date_trunc('month', NEW.date) != date_trunc('month', OLD.date) THEN
      PERFORM refresh_monthly_summary(OLD.user_id, date_trunc('month', OLD.date)::DATE);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_refresh_summary_on_transaction() TO service_role;

CREATE TRIGGER refresh_monthly_summary_on_transaction
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_summary_on_transaction();

-- ============================================
-- 2. Trigger function for paystubs
-- ============================================

CREATE OR REPLACE FUNCTION trigger_refresh_summary_on_paystub()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM refresh_monthly_summary(NEW.user_id, date_trunc('month', NEW.pay_date)::DATE);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM refresh_monthly_summary(OLD.user_id, date_trunc('month', OLD.pay_date)::DATE);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM refresh_monthly_summary(NEW.user_id, date_trunc('month', NEW.pay_date)::DATE);
    -- If the pay_date crossed a month boundary, also refresh the old month
    IF date_trunc('month', NEW.pay_date) != date_trunc('month', OLD.pay_date) THEN
      PERFORM refresh_monthly_summary(OLD.user_id, date_trunc('month', OLD.pay_date)::DATE);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_refresh_summary_on_paystub() TO service_role;

CREATE TRIGGER refresh_monthly_summary_on_paystub
  AFTER INSERT OR UPDATE OR DELETE ON paystubs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_summary_on_paystub();

-- ============================================
-- 3. Trigger function for account_balance_history (INSERT only, append-only table)
-- ============================================

CREATE OR REPLACE FUNCTION trigger_refresh_summary_on_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM refresh_monthly_summary(NEW.user_id, date_trunc('month', NEW.recorded_at)::DATE);
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION trigger_refresh_summary_on_balance() TO service_role;

CREATE TRIGGER refresh_monthly_summary_on_balance
  AFTER INSERT ON account_balance_history
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_summary_on_balance();

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION trigger_refresh_summary_on_transaction() IS 'Auto-refreshes monthly_summaries when transactions are inserted, updated, or deleted';
COMMENT ON FUNCTION trigger_refresh_summary_on_paystub() IS 'Auto-refreshes monthly_summaries when paystubs are inserted, updated, or deleted';
COMMENT ON FUNCTION trigger_refresh_summary_on_balance() IS 'Auto-refreshes monthly_summaries when new balance history records are inserted';
