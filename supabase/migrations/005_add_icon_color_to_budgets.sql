-- Add icon and color columns to budgets table for UI display

ALTER TABLE budgets
ADD COLUMN icon TEXT NOT NULL DEFAULT 'CircleDollarSign',
ADD COLUMN color TEXT NOT NULL DEFAULT '#6B7280';

-- Update existing categories with their icons and colors
UPDATE budgets SET icon = 'Home', color = '#6366F1' WHERE category = 'Rent';
UPDATE budgets SET icon = 'Zap', color = '#F59E0B' WHERE category = 'Utilities';
UPDATE budgets SET icon = 'ShoppingCart', color = '#10B981' WHERE category = 'Groceries';
UPDATE budgets SET icon = 'Car', color = '#38BDF8' WHERE category = 'Transportation';
UPDATE budgets SET icon = 'Shield', color = '#6366F1' WHERE category = 'Insurance';
UPDATE budgets SET icon = 'Heart', color = '#EC4899' WHERE category = 'Healthcare';
UPDATE budgets SET icon = 'Utensils', color = '#FF6B6B' WHERE category = 'Dining Out';
UPDATE budgets SET icon = 'Clapperboard', color = '#8B5CF6' WHERE category = 'Entertainment';
UPDATE budgets SET icon = 'ShoppingBag', color = '#A855F7' WHERE category = 'Shopping - General';
UPDATE budgets SET icon = 'Shirt', color = '#A855F7' WHERE category = 'Shopping - Clothing';
UPDATE budgets SET icon = 'CreditCard', color = '#14B8A6' WHERE category = 'Subscriptions';
UPDATE budgets SET icon = 'Plane', color = '#F59E0B' WHERE category = 'Travel';
UPDATE budgets SET icon = 'Dumbbell', color = '#EF4444' WHERE category = 'Fitness';
UPDATE budgets SET icon = 'Scissors', color = '#EC4899' WHERE category = 'Self Care';

COMMENT ON COLUMN budgets.icon IS 'Lucide icon name for UI display';
COMMENT ON COLUMN budgets.color IS 'Hex color code for UI display';
