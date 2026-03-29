# Change Log

Decisions, problems encountered, and their resolutions. Each entry documents the date, problem, scale/risk, fix, and rationale.

---

## Data Integrity

### Plaid transactions imported with NULL category_id
**Date:** 2026-02-09 | **Commit:** `e309dde`

**Problem:** Plaid sync set `category` (text) but always left `category_id` (FK) as NULL. The AI agent and all summary queries join on `category_id`, so Plaid-imported transactions were invisible to "how much did I spend on groceries?" queries and excluded from monthly summaries.

**Scale:** Every Plaid-synced transaction was affected — hundreds of rows with valid category text but no FK link. Monthly summaries underreported spending by the full amount of Plaid data.

**Example:** User asks Pachi "how much did I spend on food this month?" Agent queries `monthly_category_summaries` joined on `category_id` — returns $0 because all Plaid food transactions have `category_id = NULL` despite `category = 'FOOD_AND_DRINK'`.

**Fix:** Three-part resolution:
1. Migration to backfill `category_id` on all existing transactions by matching `lower(category)` to `categories.normalized_name`
2. `plaid-sync-transactions` edge function now resolves `category_id` at import time using merchant rules (priority) then category text matching (fallback)
3. Merchant category rules seeded from historical user corrections

**Rationale:** Fixing at import time prevents the gap from growing. Backfill handles the existing debt. Merchant rules make resolution smarter over time.

---

### Goal-linked transactions double-counted in budgets
**Date:** 2026-03-21 | **Commit:** `4b51d64`

**Problem:** Transactions tagged to a savings goal (e.g., a $500 flight tagged to "Trip to Japan") were still counted toward their expense category budget. A user saving for vacation through their Entertainment category would appear over-budget.

**Scale:** Every goal-linked expense was double-counted — once in the goal progress, once in the category budget. Users with active travel or large-purchase goals saw consistently inflated spending.

**Example:** User budgets $300/mo for Entertainment. Tags $500 concert tickets to "Trip to Japan" goal. Category shows $500/$300 spent (over-budget) even though the user intended that spend to come from savings.

**Fix:** Filter at three levels:
1. SQL: `goal_id IS NULL` filter in `monthly_category_summaries` aggregation
2. Frontend: skip goal-funded transactions in category totals and velocity chart
3. Dashboard: exclude from total spent and avg monthly spending

**Rationale:** Goal-linked spending is intentional drawdown from a savings bucket, not regular monthly spending. It needs visibility (Goal Spending section) but shouldn't trigger budget alerts.

---

### Expense transactions creating bogus goal contributions
**Date:** 2026-03-21 | **Commit:** `5fd7fd4`

**Problem:** When a user linked a transaction to a savings goal, the system created a `goal_contribution` record regardless of transaction type. Expense transactions (negative amounts) were inflating `goals.current_amount`.

**Scale:** Any expense tagged to a goal would incorrectly increase the goal balance. A $500 flight tagged to a vacation goal would add $500 to progress instead of tracking it as goal spending.

**Fix:** Replaced the `savings_funded` category type approach with goal-based budget exclusion. Only income transactions create contributions; expenses tagged to goals are tracked for visibility but don't affect `current_amount`. DB trigger on `goal_contributions` auto-updates the goal balance.

**Rationale:** Contributions and spending are fundamentally different operations. Income grows a goal; expenses draw from it. Conflating them produced nonsensical balances.

---

### needs_review flag never auto-clearing
**Date:** 2026-02-09 | **Commit:** `e309dde`

**Problem:** `needs_review` stayed `true` forever, even after a user manually categorized a transaction. The "Needs Review" tab accumulated resolved items.

**Scale:** Every reviewed transaction remained in the review queue. Over time the count became meaningless — users couldn't tell which transactions actually needed attention.

**Fix:** Database trigger that sets `needs_review = false` when `category_id` changes from NULL to a non-null value. Works for both manual categorization and future AI auto-categorization.

---

### Category system evolved through three models
**Date:** 2026-01-28 → 2026-03-21 | **Commits:** `88ad450`, `be9ba67`, `0db28d6`, `e309dde`, `5fd7fd4`

**Problem:** The category system went through multiple iterations as new financial concepts were introduced, each revealing edge cases in the previous model.

**Evolution:**
1. **Flat categories** (Jan 28) — simple list, no hierarchy. Broke down when users wanted "Food & Drink > Restaurants" vs "Food & Drink > Groceries"
2. **Hierarchical categories with parent_id** (Feb 3, `be9ba67`) — parent/child nesting. Budget table showed parent sums as read-only aggregates of children. But income, transfers, and savings needed different behavior than expenses.
3. **Five category types** (Feb 3–9, `0db28d6`, `e309dde`) — `need`, `want`, `income`, `transfer`, `savings_funded`. Each type has different rules: income is budgetable vs windfall, transfers are excluded from spending, needs/wants drive budget split.
4. **Goal-based exclusion replaces savings_funded** (Mar 21, `5fd7fd4`) — the `savings_funded` type was too blunt. Transactions keep their real category type; the goal link controls budget treatment instead.

**Example:** Travel spending funded from a savings goal. First attempt used `savings_funded` category type to exclude from budget. Problem: the category itself was Travel (a want), but the type override changed its behavior everywhere. Goal-based exclusion was more precise — the transaction keeps its real category type, and the goal link controls budget treatment.

**Rationale:** Each model was correct for its scope. The complexity grew because financial data has genuinely different semantics for different transaction types — you can't treat income and expenses the same way and get correct budgets.

---

### Merchant normalization and rule-based categorization
**Date:** 2026-02-09 | **Commit:** `e309dde`

**Problem:** Raw merchant names from Plaid and CSV are messy and inconsistent. "SQ *AMAZON.COM", "AMZN MKTP US*", and "Amazon" are all the same merchant but treated as three different entities. Without normalization, spending reports fragment across variations.

**Scale:** A typical user with 6 months of transactions might have 15-20 merchant name variations for their top 10 merchants. Category assignment can't be automated without first solving the identity problem.

**Fix:** Two-table system:
- `merchant_aliases` — maps raw strings to canonical names (e.g., "SQ *AMAZON.COM" → "Amazon")
- `merchant_category_rules` — pattern matching (exact/contains/starts_with) with priority ordering, seeded from historical user corrections

Rules are checked during Plaid sync before Plaid's own category. A user correction becomes a permanent rule.

---

### needs_review defaulting to false on Plaid imports
**Date:** 2026-02-18 | **Commit:** `91757d4`

**Problem:** New Plaid-synced transactions arrived with `needs_review = false`, so they never appeared in the review queue even when they had no category.

**Example:** User syncs 47 new transactions from Chase. All land in the "Reviewed" tab. User has no idea they exist or need categorization.

**Fix:** Set `needs_review` default to `true` in the Plaid sync upsert. Transactions start as needing review and auto-clear once categorized.

---

## Transaction Classification

### Transfers misclassified as income
**Date:** 2026-02-06 | **Commit:** `f60467c`

**Problem:** Transaction type detection relied on amount sign: positive = income, negative = expense. Credit card payments (positive amounts from the card's perspective) were classified as income.

**Scale:** Every credit card payment and account transfer with a positive amount was miscategorized. This inflated income figures and skewed budget calculations.

**Example:** $2,000 credit card payment appears as income on the Income page, making monthly income appear $2,000 higher than reality.

**Fix:** Transfer category check now takes precedence over amount sign. Added "Credit Card Payment" and "Account Transfer" as default transfer categories seeded for all users.

**Rationale:** Category type is a more reliable signal than amount sign. A transaction categorized as a transfer is a transfer regardless of its sign.

---

### Credit card payment pairs not detected
**Date:** 2026-02-07 | **Commit:** `67dc503`

**Problem:** Paying a credit card creates two transactions: a debit from checking and a credit on the card. Without detection, both appear as separate transactions — the debit looks like spending, the credit looks like income.

**Scale:** Every credit card payment cycle created phantom income + phantom spending entries.

**Fix:** Cross-account transfer pair detection. Groups matching amounts across accounts, auto-categorizes as "Credit Card Payment", keeps the bank-side transaction and marks the card-side as reconciled.

---

### Duplicate transactions across sources
**Date:** 2026-02-06 → 2026-02-07 | **Commits:** `3095cd1`, `51198ee`

**Problem:** Users who imported CSV then connected Plaid got duplicate entries. Same transaction from different sources appeared twice with slightly different merchant names and dates.

**Scale:** Proportional to overlap between CSV history and Plaid sync window. Could easily be 100+ duplicates per account.

**Fix:** Multi-step reconciliation modal. Client-side detection groups by amount, then scores date/merchant similarity. User confirms or dismisses each match. Later extended to flag same-source Plaid duplicates.

---

### Plaid environment misconfigured for production
**Date:** 2026-02-06 | **Commit:** `e92a146`

**Problem:** Plaid integration was pointing to the deprecated `development` environment. Accounts could be linked in sandbox but real bank connections failed silently.

**Scale:** Complete blocker — no real bank data could be synced until fixed.

**Fix:** Switched to `production` environment, improved error surfacing from edge functions to frontend, added "Synced X ago" timestamps on accounts so users can tell if sync is working.

---

### Reimbursement tracking and split expenses
**Date:** 2026-02-28 | **Commit:** `1bc2c41`

**Problem:** Shared expenses (e.g., splitting a dinner) appeared as full-amount spending in budgets. No way to track that $50 of a $100 dinner is owed back. Pending reimbursements were invisible.

**Scale:** Users who frequently split expenses saw inflated monthly spending. A $200 group dinner where the user owes $50 shows as $200 in their budget.

**Fix:** Full reimbursement system:
- Split with Others modal to divide expenses and track pending amounts
- Resolve Reimbursement modal to match incoming payments or write off
- `pending_reimbursements` table (migration 039)
- Reimbursement matcher utility for auto-suggesting matches from incoming transactions
- Plaid sync preserves user-modified split amounts on transaction updates (doesn't overwrite manual corrections)

---

### Goal auto-contributions from income categories replaced paystub field linking
**Date:** 2026-03-21 | **Commit:** `c80a379`

**Problem:** Original design linked goals to specific paystub fields (e.g., "401k deduction from paycheck"). This required paystub imports to be up-to-date and couldn't work with Plaid-sourced income transactions that have no paystub.

**Scale:** Goals only auto-contributed when paystubs were imported. Users relying on Plaid for income tracking got no auto-contributions.

**Fix:** Replaced paystub field selector with income category linking. `goal_income_links` table maps goals to income categories with a percentage. Postgres trigger auto-creates `goal_contributions` when transactions are categorized as linked income. Works with any income source — Plaid, CSV, or manual.

**Rationale:** Income category is the stable identifier that exists regardless of how the transaction entered the system. Paystub fields were an implementation detail.

---

## Security

### Plaid access tokens stored in plaintext
**Date:** 2026-02-24 | **Commit:** `419add9`

**Problem:** Plaid access tokens grant ongoing access to user bank accounts. Stored as plaintext in the `plaid_items` table, readable by anyone with database access.

**Scale:** A single database breach exposes every connected bank account. Plaid tokens don't expire — an attacker could pull transaction history indefinitely.

**Fix:** AES-256 encryption via pgcrypto:
- `SECURITY DEFINER` RPC functions mediate all read/write access
- Column-level SELECT revoked from `anon` and `authenticated` roles
- Tokens encrypted at rest, decrypted only in server-side function calls
- CORS restricted from wildcard to specific domains
- Error messages sanitized (generic to client, details server-side)
- Sourcemaps disabled in production build

**Rationale:** For a finance app handling real bank credentials, plaintext storage was unacceptable. pgcrypto was the simplest approach that didn't require an external KMS while still providing meaningful defense-in-depth.

---

### Plaid token exchange auth failures
**Date:** 2026-03-21 | **Commit:** `37dbc76`

**Problem:** `supabase.functions.invoke` was silently dropping the `apikey` header, causing 401s on the token exchange edge function. Users could initiate Plaid Link but the callback would fail — accounts appeared linked but never synced.

**Scale:** Intermittent — depended on Supabase client session state. Some users could connect on first try, others never could.

**Fix:** Replaced `supabase.functions.invoke` with direct `fetch` + session refresh. Also fixed a BYTEA type mismatch in the `get_plaid_access_token` and `verify_plaid_item_ownership` RPCs that broke after the encryption migration.

---

## AI Agent

### Unconstrained LLM tool loops
**Date:** 2026-03-07 | **Commit:** `e5cb0d0`

**Problem:** The AI agent could invoke tools in a loop with no ceiling. A poorly phrased question could trigger dozens of sequential tool calls, each costing API tokens and adding latency.

**Scale:** Each tool call is ~500-2000 tokens round-trip. An unbounded loop of 20 calls could cost $0.50+ per chat message and take 30+ seconds.

**Example:** "Compare my spending across every month this year" could trigger 12 sequential `get_monthly_summary` calls if uncapped.

**Fix:** `stopWhen: stepCountIs(5)` — hard limit of 5 tool execution steps per chat turn. Most useful queries resolve in 1-3 calls.

**Rationale:** Bounded cost and latency. The limit has never been the bottleneck in practice. If a query needs more depth, the user can ask follow-up questions.

---

### AI agent query returning wrong merchant data
**Date:** 2026-03-21 | **Commit:** `42d8d1e`

**Problem:** The `get_top_merchants` and `query_transactions` tools referenced a column called `merchant_name` but the actual column is `merchant`. Queries returned empty results.

**Fix:** Fixed column name in query tools. Added tool call logging to chat route for debugging future issues.

---

### Chat route accepting malformed payloads
**Date:** 2026-03-07 | **Commit:** `493d177`

**Problem:** The `/api/chat` endpoint passed request bodies directly to AI SDK without validation. Malformed message structures could cause cryptic SDK errors or unexpected behavior.

**Fix:** Zod schema validation on request body. Validates message structure (id, role, parts) before passing to AI SDK, rejecting bad payloads with descriptive errors.

---

## UI / UX

### Category cards re-animating on every state change
**Date:** 2026-01-29 | **Commit:** `22e6009`

**Problem:** `CategoryCard` was defined inside `BudgetView`, so React recreated it on every render. Cards re-animated when clicking dropdowns or typing in budget inputs.

**Fix:** Moved `CategoryCard` component outside `BudgetView`. Component identity is now stable across renders.

---

### Date fields corrupted on paystub save
**Date:** 2026-01-29 | **Commit:** `e18c9f5`

**Problem:** `parseFloat()` was applied to all paystub fields including dates. "2026-01-15" became `2026`.

**Fix:** Excluded date fields from numeric conversion.

---

### Transaction avatars competing for attention
**Date:** 2026-02-23 | **Commit:** `03c4a6e`

**Problem:** Saturated filled-circle avatars with white initials made every transaction row visually loud. "Needs review" badges and anomaly indicators couldn't stand out because everything was equally prominent.

**Example:** A list of 30 transactions where every row has a bright blue/green/red circle. The 3 transactions that actually need attention are invisible.

**Fix:** Switched to tinted circles — low-opacity category color background with colored text. Normal transactions became visually quiet, reserving visual intensity for items that need attention.

**Rationale:** Design principle: "Reserve visual intensity for things that need attention." If everything is loud, nothing stands out.

---

### Flash of $0 on dashboard load
**Date:** 2026-02-23 | **Commit:** `c4f2dac`

**Problem:** `useExpectedIncome` initialized `loading` as `false`. Before the async fetch completed, the dashboard rendered "$0.00" for expected income, then jumped to the real value.

**Fix:** Initialize loading state to `true` and show skeleton loaders until data arrives.

---

### Overflow bugs across multiple pages
**Date:** 2026-03-20 | **Commit:** `031ffbf`

**Problem:** Long merchant names overflowed the daily spending card. Parent category dropdowns were clipped by `overflow-hidden` on the budget table. Current month with no data showed an empty gap in the income chart.

**Fix:** Targeted CSS fixes: truncation + `min-w-0` for merchant names, `overflow-visible` on table container, `>=` comparison for current month forecast.

---

### Selected child category border clipped
**Date:** 2026-02-23 | **Commit:** `c1f220c`

**Problem:** The selected category's left-edge color bar was invisible because a parent container had `overflow-hidden`.

**Fix:** Scoped `overflow-hidden` to the inner content area, leaving the border decoration visible.

---

## Architecture

### Component reorganization from flat to structured directories
**Date:** 2026-02-09 | **Commit:** `b9c3d4c`

**Problem:** All components lived in a flat `src/components/` directory. With 40+ files, finding related components was difficult. The 4 largest view files (TransactionsView, BudgetView, AccountsView, IncomeView) were 500-800 lines each with inline sub-components.

**Scale:** Every new feature added 1-3 files to the same flat directory. Code review and navigation degraded linearly.

**Fix:** Restructured into `views/`, `modals/`, `charts/`, `common/` subdirectories. Extracted reusable sub-components from the 4 largest views. Deleted 3 unused components. Moved misplaced type/utility exports to proper locations.

**Rationale:** Waited until the component set was stable enough that the directory structure wouldn't need to change again immediately. Doing it earlier would have been premature; doing it later would have been harder.

---

### Tab-based SPA with no router
**Date:** 2026-01-28 | **Commit:** `88ad450`

**Problem:** Needed to choose between Next.js/React Router and simple conditional rendering for a personal tool with 8 views.

**Decision:** Vanilla React SPA with tab-based navigation in `App.tsx`. No URL-based routing.

**Trade-off:** No deep linking, no URL-based state, harder code-splitting if the app grows. But for a single-user personal tool, the simplicity outweighed the missing features. A router adds indirection that wasn't needed at this scale.

---

### Direct Supabase queries instead of caching layer
**Date:** 2026-01-28 | **Commit:** `88ad450`

**Problem:** Needed to decide on a data fetching strategy — React Query/Redux/Zustand vs. direct Supabase calls.

**Decision:** Components call `supabase.from('table').select(...)` directly, with shared hooks like `useExpectedIncome` and `useMonthlySummary` for reuse. No client-side cache.

**Trade-off:** No request deduplication or caching. But for a single-user app, direct queries were sufficient. The materialized monthly summary tables handle the performance-critical path server-side.

---

### Deno edge functions for Plaid (no Node SDK)
**Date:** 2026-02-05 | **Commit:** `ac145d1`

**Problem:** Plaid's official SDK is Node.js-only. Supabase Edge Functions run Deno. Using the SDK would have required a separate Node backend just for Plaid.

**Decision:** Call Plaid's REST API directly with `fetch()` from Deno edge functions.

**Trade-off:** No SDK-level type safety for Plaid responses, more boilerplate per API call. But Plaid's REST API is well-documented and the SDK is mostly a typed wrapper around fetch anyway. Avoiding a separate Node backend eliminated an entire deployment target.

---

### Separate AI server vs. edge functions
**Date:** 2026-03-07 | **Commit:** `e5cb0d0`

**Problem:** Edge Functions run Deno with cold-start constraints. The AI SDK's streaming, tool orchestration, and provider abstraction required full Node.js runtime features unavailable in Deno.

**Decision:** Standalone Fastify server (`server/`) using Vercel AI SDK v6, deployed separately.

**Trade-off:** Two-service deployment, CORS configuration, separate auth validation. But: isolated LLM complexity, independent scaling, full Node.js ecosystem access. The operational overhead was worth the capability gain.

---

### Pre-aggregated monthly summaries vs. live aggregation
**Date:** 2026-02-09 | **Commits:** `bcc51cf`, `c4f2eef`

**Problem:** Dashboard and AI agent both need monthly aggregates. Computing from raw transactions on every page load and every chat message was too slow.

**Scale:** The AI agent calls `buildFinancialSnapshot()` on every chat turn. Without pre-aggregation, each turn re-aggregates months of transactions across 6 tables.

**Decision:** Materialized `monthly_summaries` and `monthly_category_summaries` tables with auto-refresh triggers on transaction changes.

**Trade-off:** Schema maintenance burden (47+ migrations) and eventual consistency on inserts. But dashboard loads in <1s and AI snapshot queries are fast.

---

### Design system as prose in CLAUDE.md
**Date:** 2026-01-28 | **Commit:** `88ad450`

**Problem:** 78+ source files built through AI-assisted development needed visual consistency. A traditional component library requires discovery and understanding by the AI; prose instructions are read automatically on every interaction.

**Decision:** Full design system encoded as prose in CLAUDE.md — colors, typography, spacing, component patterns, interaction states.

**Trade-off:** Not enforceable by linting or type-checking. But the primary consumer is Claude Code, and prose instructions the AI always reads turned out to be more effective than a component library it would need to discover.

---

### Deterministic waterfall engine
**Date:** 2026-01-28 | **Commit:** `88ad450`

**Problem:** The app's core value prop — "where should my next dollar go?" — requires opinionated financial advice. Making it configurable would require a priority editor UI and explaining trade-offs most users shouldn't need to think about.

**Decision:** Hardcoded 5-step priority: emergency fund -> 401k match -> high-interest debt -> ESPP -> RSU diversification. Pure function, no per-user customization.

**Rationale:** The waterfall reflects near-universal financial advisor consensus. Opinionated defaults beat flexible confusion for a personal tool.

---

### Income projection logic
**Date:** 2026-02-07 | **Commit:** `51198ee`

**Problem:** Expected income was originally based on paystub data, but paystubs are imported manually and often lag behind. Needed a more reliable source.

**Decision:** Transaction-based income with salary projection:
- 2+ salary deposits this month: use actual sum
- 1 deposit: project 2x
- 0 deposits: fall back to previous month

Consolidated duplicated paystub-based logic from BudgetView and TransactionFeed into one shared hook.

---

### Savings as residual vs. explicit allocation
**Date:** 2026-03-21 | **Commit:** `35eb6ed`

**Problem:** Initially, savings was the sum of individual goal monthly budgets. This required users to explicitly allocate every savings dollar to a goal. Unallocated income wasn't visible.

**Decision:** Savings = expected income - needs budget - wants budget. Every dollar is accounted for by definition. Removed "Total Budget" display and "Left to Allocate" row.

**Rationale:** Residual-based savings is simpler to understand and requires no manual allocation. It answers "how much should I have left?" without forcing the user to define every savings bucket.

---

## Deferred Decisions

### CSV schema mapper
**Date:** 2026-01-28 | **Status:** Not needed yet. Implement when importing from a second bank with different column names.

**Problem it would solve:** Different banks export different CSV formats — `Description` vs `Merchant` vs `Payee`, split `Debit`/`Credit` columns vs single `Amount`, `Transaction Date` vs `Post Date`.

**Recommended approach:** Bank presets (`chase`, `bofa`, etc.) with auto-detection + manual mapping fallback UI. Current single-format parser is sufficient while only one bank's CSV is used.
