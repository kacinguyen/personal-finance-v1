# Data Foundations for AI Agent Readiness

## Context
Before building the AI agent backend, the data model has critical gaps that would severely limit agent effectiveness. Plaid-imported transactions have `category_id: null` (text `category` is set but never resolved to the FK), merchant names are messy and not normalized, and there's no mechanism to learn from user categorization corrections. These need to be fixed first — otherwise the AI agent can't answer basic questions like "how much did I spend on groceries last month?" for Plaid data.

## What This Covers
- Database migrations to fill data gaps
- One Edge Function fix (Plaid sync category resolution)
- One frontend trigger improvement

## What This Does NOT Cover
- The AI agent backend itself (see `AI_AGENT_TODO.md`)
- Frontend chat UI

---

## Key Data Gaps Found

| Gap | Impact | Severity |
|-----|--------|----------|
| **`category_id` is NULL on Plaid imports** | AI can't join transactions to category hierarchy for any Plaid data | **CRITICAL** |
| **No merchant normalization stored** | "SQ *AMAZON.COM" vs "AMZN MKTP US*" treated as different merchants | **HIGH** |
| **No categorization rules/learning** | User corrections aren't stored as reusable rules; AI can't learn patterns | **HIGH** |
| **`needs_review` never auto-resolves** | Stays `true` forever even after user categorizes the transaction | **MEDIUM** |
| **No chat history persistence** | Conversations lost on page refresh; AI can't reference prior context | **MEDIUM** |

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/028_backfill_category_ids.sql` | **Create** | Resolve `category_id` from `category` text on all existing transactions |
| `supabase/migrations/029_create_merchant_category_rules.sql` | **Create** | Merchant normalization + categorization rules tables |
| `supabase/migrations/030_auto_clear_needs_review.sql` | **Create** | Trigger to clear `needs_review` when `category_id` is set |
| `supabase/migrations/031_create_chat_histories.sql` | **Create** | Conversation history tables for AI chat persistence |
| `supabase/functions/plaid-sync-transactions/index.ts` | **Modify** | Resolve `category_id` on Plaid import using category name matching |

---

## Migration Details

### 028: Backfill `category_id` from `category` text

The transactions table has two category columns:
- `category` (TEXT) — populated by Plaid/CSV import with the category name
- `category_id` (UUID FK) — often NULL even when `category` has a value

This migration resolves `category_id` for all existing transactions where it's NULL but `category` text exists, by matching against `categories.normalized_name`.

```sql
-- Match transaction.category (lowercased) to categories.normalized_name
UPDATE transactions t
SET category_id = c.id
FROM categories c
WHERE t.category_id IS NULL
  AND t.category IS NOT NULL
  AND t.user_id = c.user_id
  AND lower(trim(t.category)) = c.normalized_name;
```

Also backfill via parent category name matching for hierarchical categories (e.g., "Rent" -> find child category "Rent" under parent "Home").

---

### 029: Merchant-to-category rules tables

Two tables:

**`merchant_category_rules`** — user-scoped rules that map merchant patterns to categories. The AI agent will read these to auto-categorize, and write new ones when the user corrects a categorization.

```
merchant_category_rules:
  id              UUID PK
  user_id         UUID FK -> auth.users
  match_pattern   TEXT NOT NULL        -- normalized merchant string or substring
  match_type      TEXT NOT NULL        -- 'exact' | 'contains' | 'starts_with'
  category_id     UUID FK -> categories
  priority        INTEGER DEFAULT 0    -- higher = checked first
  source          TEXT NOT NULL        -- 'user_correction' | 'ai_suggested' | 'manual'
  hit_count       INTEGER DEFAULT 0    -- times this rule matched
  created_at      TIMESTAMPTZ
  updated_at      TIMESTAMPTZ
  UNIQUE(user_id, match_pattern, match_type)
```

**`merchant_aliases`** — maps raw merchant strings to a normalized canonical form. Built from existing transaction data + Plaid merchant names.

```
merchant_aliases:
  id                  UUID PK
  user_id             UUID FK -> auth.users
  raw_merchant        TEXT NOT NULL     -- original messy string ("SQ *AMAZON.COM")
  normalized_merchant TEXT NOT NULL     -- cleaned canonical name ("Amazon")
  source              TEXT NOT NULL     -- 'plaid' | 'csv' | 'user' | 'ai'
  created_at          TIMESTAMPTZ
  UNIQUE(user_id, raw_merchant)
```

**Seed from existing data:** Insert rules derived from transactions that already have `category_id` set (user's historical corrections):

```sql
INSERT INTO merchant_category_rules (user_id, match_pattern, match_type, category_id, source, hit_count)
SELECT DISTINCT ON (t.user_id, lower(trim(t.merchant)))
  t.user_id,
  lower(trim(t.merchant)),
  'exact',
  t.category_id,
  'user_correction',
  COUNT(*) OVER (PARTITION BY t.user_id, lower(trim(t.merchant)), t.category_id)
FROM transactions t
WHERE t.category_id IS NOT NULL
  AND t.merchant IS NOT NULL
ORDER BY t.user_id, lower(trim(t.merchant)), count(*) OVER (...) DESC;
```

---

### 030: Auto-clear `needs_review` trigger

When a transaction's `category_id` changes from NULL to a non-null value, automatically set `needs_review = false`. This integrates with both manual categorization and future AI auto-categorization.

```sql
CREATE FUNCTION auto_clear_needs_review()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category_id IS NOT NULL AND OLD.category_id IS NULL THEN
    NEW.needs_review := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clear_needs_review_on_categorize
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_clear_needs_review();
```

---

### 031: Chat conversation history tables

Persistent storage for AI chat conversations (instead of localStorage). Enables the agent to reference prior conversations and the user to see chat history across sessions.

```
chat_conversations:
  id          UUID PK
  user_id     UUID FK -> auth.users
  title       TEXT              -- auto-generated or user-set
  created_at  TIMESTAMPTZ
  updated_at  TIMESTAMPTZ

chat_messages:
  id                UUID PK
  conversation_id   UUID FK -> chat_conversations ON DELETE CASCADE
  user_id           UUID FK -> auth.users
  role              TEXT NOT NULL  -- 'user' | 'assistant' | 'system'
  content           TEXT NOT NULL
  tool_calls        JSONB          -- tool invocations (for debugging/audit)
  token_count       INTEGER        -- track usage
  created_at        TIMESTAMPTZ
```

RLS policies: users can only access their own conversations and messages.

---

## Edge Function Fix

### `plaid-sync-transactions/index.ts` — Resolve `category_id` on import

Currently, Plaid sync sets:
```typescript
category: tx.personal_finance_category?.primary || tx.category?.[0] || null,
category_id: null,  // <-- always null
```

**Fix:** After building the transaction objects, query the user's categories to resolve `category_id`:

1. Fetch user's categories: `SELECT id, normalized_name FROM categories WHERE user_id = ?`
2. For each transaction, match `category` text (lowercased) against `normalized_name`
3. Also check `merchant_category_rules` for merchant-based matching (higher priority than Plaid category)
4. Set `category_id` if a match is found; keep `needs_review: true` if no match

---

## Implementation Order

### Phase 1: Critical (do first)
- [ ] Migration 028 — backfill `category_id` on existing transactions
- [ ] Migration 029 — create `merchant_category_rules` + `merchant_aliases` tables, seed from historical data
- [ ] Fix `plaid-sync-transactions` Edge Function to resolve `category_id` on import

### Phase 2: Quality of Life
- [ ] Migration 030 — auto-clear `needs_review` trigger
- [ ] Migration 031 — chat conversation history tables

### Phase 3: Ongoing (after AI agent is built)
- [ ] AI agent writes to `merchant_category_rules` when user corrects a categorization
- [ ] AI agent writes to `merchant_aliases` when it normalizes a merchant name
- [ ] Build "Auto-categorize" flow that reads rules + calls LLM for unknowns

---

## Verification

1. `npx supabase db push` — all 4 migrations apply cleanly
2. Query: `SELECT count(*) FROM transactions WHERE category IS NOT NULL AND category_id IS NULL` -> should return 0 after 028
3. Query: `SELECT count(*) FROM merchant_category_rules` -> should have rows seeded from historical data
4. Update a transaction's `category_id` from NULL to a value -> verify `needs_review` auto-clears to false
5. Run Plaid sync -> verify new transactions get `category_id` resolved when category name matches
6. Query `chat_conversations` and `chat_messages` -> tables exist with correct RLS
