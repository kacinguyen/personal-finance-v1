-- Add default transfer categories for all existing users
-- These were missing from the initial seed, causing transfers to have no category options

INSERT INTO categories (user_id, name, normalized_name, icon, color, category_type, is_system, is_active)
SELECT
  u.id,
  c.name,
  c.normalized_name,
  c.icon,
  c.color,
  c.category_type,
  true,
  true
FROM auth.users u
CROSS JOIN (
  VALUES
    ('Credit Card Payment', 'credit card payment', 'CreditCard', '#8B5CF6', 'transfer'),
    ('Account Transfer', 'account transfer', 'ArrowLeftRight', '#6366F1', 'transfer')
) AS c(name, normalized_name, icon, color, category_type)
ON CONFLICT (user_id, normalized_name) DO NOTHING;
