-- Migration: Create merchant normalization and category rules tables
-- Enables automatic categorization of transactions based on merchant name patterns.

-- ============================================
-- 1. Create merchant_category_rules table
-- ============================================

CREATE TABLE merchant_category_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern TEXT NOT NULL,              -- The pattern to match against merchant name
  match_type TEXT NOT NULL DEFAULT 'contains'
    CHECK (match_type IN ('exact', 'contains', 'starts_with')),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  priority INTEGER NOT NULL DEFAULT 0, -- Higher = checked first
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchant_rules_user ON merchant_category_rules(user_id);
CREATE INDEX idx_merchant_rules_active ON merchant_category_rules(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_merchant_rules_priority ON merchant_category_rules(user_id, priority DESC);

-- Updated_at trigger
CREATE TRIGGER update_merchant_rules_updated_at
  BEFORE UPDATE ON merchant_category_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Create merchant_aliases table
-- ============================================

CREATE TABLE merchant_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_name TEXT NOT NULL,             -- Original merchant string from Plaid
  canonical_name TEXT NOT NULL,       -- Normalized/display name
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, raw_name)
);

CREATE INDEX idx_merchant_aliases_user ON merchant_aliases(user_id);
CREATE INDEX idx_merchant_aliases_raw ON merchant_aliases(user_id, raw_name);

-- ============================================
-- 3. Enable RLS
-- ============================================

ALTER TABLE merchant_category_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_aliases ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies for merchant_category_rules
-- ============================================

CREATE POLICY "Users can view own merchant rules" ON merchant_category_rules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own merchant rules" ON merchant_category_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own merchant rules" ON merchant_category_rules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own merchant rules" ON merchant_category_rules
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. RLS Policies for merchant_aliases
-- ============================================

CREATE POLICY "Users can view own merchant aliases" ON merchant_aliases
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own merchant aliases" ON merchant_aliases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own merchant aliases" ON merchant_aliases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own merchant aliases" ON merchant_aliases
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 6. Seed rules from existing categorized transactions
-- ============================================
-- Create rules from merchants that consistently map to the same category.
-- Only create rules where a merchant has 3+ transactions with the same category.

INSERT INTO merchant_category_rules (user_id, pattern, match_type, category_id, priority)
SELECT DISTINCT ON (t.user_id, lower(trim(t.merchant)))
  t.user_id,
  lower(trim(t.merchant)),
  'exact',
  t.category_id,
  0
FROM transactions t
WHERE t.merchant IS NOT NULL
  AND t.category_id IS NOT NULL
GROUP BY t.user_id, lower(trim(t.merchant)), t.category_id
HAVING COUNT(*) >= 3
ON CONFLICT DO NOTHING;

-- Seed merchant aliases from existing transactions
INSERT INTO merchant_aliases (user_id, raw_name, canonical_name)
SELECT DISTINCT ON (t.user_id, t.merchant)
  t.user_id,
  t.merchant,
  t.merchant
FROM transactions t
WHERE t.merchant IS NOT NULL
ON CONFLICT (user_id, raw_name) DO NOTHING;

-- ============================================
-- 7. Comments
-- ============================================

COMMENT ON TABLE merchant_category_rules IS 'Rules for automatically categorizing transactions based on merchant name patterns';
COMMENT ON TABLE merchant_aliases IS 'Maps raw merchant strings to normalized canonical names';
COMMENT ON COLUMN merchant_category_rules.match_type IS 'How to match: exact, contains, or starts_with';
COMMENT ON COLUMN merchant_category_rules.priority IS 'Higher priority rules are checked first (0 = default)';
