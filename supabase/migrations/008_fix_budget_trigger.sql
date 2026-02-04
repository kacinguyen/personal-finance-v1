-- Fix: Update the trigger function to bypass RLS
-- The issue is that RLS policies check auth.uid() which isn't available during trigger execution

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_default_budgets_for_user();

-- Recreate the function with proper permissions to bypass RLS
CREATE OR REPLACE FUNCTION create_default_budgets_for_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert default budget categories for the new user
  -- Using SECURITY DEFINER + explicit schema allows bypassing RLS
  INSERT INTO public.budgets (user_id, category, monthly_limit, budget_type, flexibility, icon, color, is_active)
  VALUES
    (NEW.id, 'Food & Dining', 600, 'need', 'variable', 'Utensils', '#FF6B6B', true),
    (NEW.id, 'Transportation', 400, 'need', 'variable', 'Car', '#38BDF8', true),
    (NEW.id, 'Housing', 2000, 'need', 'fixed', 'Home', '#10B981', true),
    (NEW.id, 'Utilities', 200, 'need', 'variable', 'Zap', '#F59E0B', true),
    (NEW.id, 'Healthcare', 150, 'need', 'variable', 'Heart', '#EC4899', true),
    (NEW.id, 'Entertainment', 200, 'want', 'variable', 'Clapperboard', '#A855F7', true),
    (NEW.id, 'Shopping', 300, 'want', 'variable', 'ShoppingBag', '#6366F1', true);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail user creation
    RAISE WARNING 'Failed to create default budgets for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the function
GRANT EXECUTE ON FUNCTION create_default_budgets_for_user() TO service_role;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_budgets_for_user();
