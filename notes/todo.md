# Finance App — Prioritized Backlog

All planned work in one place. Grouped by priority tier based on user impact and dependency order.

---

## What's Done

- Database schemas (transactions, paystubs, budgets, goals, accounts, categories, monthly summaries)
- CSV import (basic file upload + parsing)
- Paystub PDF import (parser, preview, confirmation modal)
- Category manager UI (create/edit, icons, colors, needs/wants)
- Expense dashboard (aggregates, budget progress, income sync)
- Auth (sign-in/sign-up, RLS, AuthContext, ProtectedRoute)
- AI agent server (Fastify, 13 read-only tools, streaming chat, system prompt)
- AI chat frontend (ChatPanel, ChatButton, ChatMessage, ChatInput, inline tab)
- Data foundations (backfill category_id, merchant rules + aliases, auto-clear needs_review, Plaid sync resolution)
- Chat history persistence (database-backed)
- Proactive AI insights (generate-insights, get-top-merchants, compare-months)
- Dashboard (live metrics, top categories, yearly chart, spending projections)
- Goal edit/delete
- Plaid transaction sync (live, with category resolution + merchant rules)

---

## P0 — High Impact, Near-Term

### Smart Categorization
- [ ] Capture additional Plaid metadata: `personal_finance_category.detailed`, `confidence_level`, `location`, `counterparty`, `merchant_entity_id`
- [ ] AI write tools: `categorize-transaction` and `update-transaction` in agent server
- [ ] Auto-categorize button in TransactionsView (batch process `needs_review` transactions)
- [ ] Learn from user corrections: auto-create merchant rules when user re-categorizes
- [ ] Merchant-to-category rules UI (view, edit, delete rules)

### Waterfall Recommendations
- [ ] Surface waterfall engine as first-class feature (not just chat tool)
- [ ] Calculate "Unallocated Cash" (income - expenses - contributions)
- [ ] Auto-log 401k/ESPP contributions from paystubs to savings progress

### Goal Management
- [ ] Pause/resume goal contributions
- [ ] Manual contributions to goals
- [ ] Reorder goals by priority

---

## P1 — Important, Medium-Term

### Dashboard Enhancements
- [ ] Budget status card with spending pace indicator (ahead/behind) + trend arrow vs. previous month
- [ ] Monthly overview grid: color-coded months by budget status, year-to-date totals
- [ ] Quick stats: daily average spending, projected month-end, savings rate
- [ ] Goal progress cards with projected completion dates + contribution suggestions

### Spending & Income Insights
- [ ] Over-budget alerts for exceeded category limits
- [ ] Unusual spending alerts (e.g., "Dining 40% higher than usual")
- [ ] Top spending categories + biggest transactions this month
- [ ] Category spending vs. last month comparison
- [ ] Income trends over time + paycheck breakdown
- [ ] Monthly take-home trends chart (net pay vs. gross pay)
- [ ] Tax withholding summary

### Budgeting
- [ ] Flex budgeting: allow budget categories to flex based on monthly variance (e.g., groceries can borrow from dining if under)
- [ ] Trip/event budget suggestions: given a trip description (destination, duration, activities), suggest a budget breakdown with estimated amounts

### CSV Import Improvements
- [ ] Preview modal before import (transaction count, date range)
- [ ] Category mapping preview (merchant -> category)
- [ ] Bulk category assignment for unmapped merchants
- [ ] Duplicate detection (transactions already imported)

---

## P2 — Nice-to-Have, Longer-Term

### AI Agent Polish
- [ ] Rate limiting (`@fastify/rate-limit`)
- [ ] Request logging
- [ ] Error handling middleware

### Advanced Categorization (AI/ML)
- [ ] LLM-based categorization for unresolved transactions (batch or inline)
- [ ] Web search for cryptic merchant names ("SQ *BLUE BOTTLE COF" -> "Blue Bottle Coffee")
- [ ] Location-based intelligence (travel vs. home spending, geographic clustering)
- [ ] Agent-based enrichment pipeline (rules -> Plaid detailed -> web search -> LLM -> auto-assign or suggest)

### Auth Hardening
- [ ] Email verification flow (confirmation screen, resend button, redirect)
- [ ] Forgot password / password reset flow
- [ ] Session management (expiration handling, remember me, secure logout)

### Live Automation (Plaid)
- [ ] Sync investment account balances (401k/brokerage)
- [ ] Update net worth with real-time data
