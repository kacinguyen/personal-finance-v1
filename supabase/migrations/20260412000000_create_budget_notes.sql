-- Budget notes: user-provided context about upcoming expenses for a target month.
-- Created via chat ("wedding next month ~$500"), used by budget recommendation tools.

CREATE TABLE IF NOT EXISTS budget_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_month DATE NOT NULL,
  note TEXT NOT NULL,
  estimated_amount DECIMAL(12,2),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_budget_notes_user_month
  ON budget_notes(user_id, target_month);

-- RLS
ALTER TABLE budget_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY budget_notes_select ON budget_notes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY budget_notes_insert ON budget_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY budget_notes_update ON budget_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY budget_notes_delete ON budget_notes
  FOR DELETE USING (auth.uid() = user_id);
