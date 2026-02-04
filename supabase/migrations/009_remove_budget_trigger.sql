-- Remove the trigger since we're seeding budgets from the client side
-- This is more reliable in Supabase's auth system

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_default_budgets_for_user();
