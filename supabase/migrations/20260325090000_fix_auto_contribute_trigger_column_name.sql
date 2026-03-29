-- Fix: trigger referenced NEW.name but transactions table uses "merchant"
-- This caused an unhandled exception that rolled back the entire category update

CREATE OR REPLACE FUNCTION auto_contribute_on_income_categorization()
RETURNS TRIGGER AS $$
DECLARE
  v_link RECORD;
  v_category_type TEXT;
  v_contribution_amount DECIMAL(12,2);
BEGIN
  -- Only proceed if category_id was just set or changed
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.category_id IS NOT DISTINCT FROM NEW.category_id THEN
    RETURN NEW;
  END IF;

  -- Check if the new category is an income category
  SELECT category_type INTO v_category_type
  FROM categories
  WHERE id = NEW.category_id;

  IF v_category_type != 'income' THEN
    RETURN NEW;
  END IF;

  -- Only process positive amounts (income)
  IF NEW.amount <= 0 THEN
    RETURN NEW;
  END IF;

  -- Find all goal_income_links that match this category for this user
  FOR v_link IN
    SELECT gil.goal_id, gil.percentage
    FROM goal_income_links gil
    JOIN goals g ON g.id = gil.goal_id AND g.is_active = true
    WHERE gil.category_id = NEW.category_id
      AND gil.user_id = NEW.user_id
  LOOP
    v_contribution_amount := ROUND(NEW.amount * v_link.percentage / 100, 2);

    -- Skip tiny contributions
    IF v_contribution_amount < 0.01 THEN
      CONTINUE;
    END IF;

    -- Insert contribution (ignore if this transaction already has one for this goal)
    INSERT INTO goal_contributions (
      goal_id,
      amount,
      contribution_date,
      source,
      transaction_id,
      user_id,
      notes
    ) VALUES (
      v_link.goal_id,
      v_contribution_amount,
      NEW.date,
      'income_auto',
      NEW.id,
      NEW.user_id,
      v_link.percentage || '% of ' || NEW.merchant
    )
    ON CONFLICT (transaction_id, goal_id) WHERE transaction_id IS NOT NULL
    DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
