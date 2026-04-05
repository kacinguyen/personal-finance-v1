# Project: Personal Finance Dashboard (Plaid + 401k/ESPP)

## Build & Test Commands
- **Start Dev Server:** `npm run dev`
- **Run Tests:** `npm test`
- **Lint:** `npm run lint`
- **Database Push:** `npx supabase db push`

## Architecture & Stack
- **Frontend:** React, Tailwind CSS (Scaffolded from Magic Patterns).
- **Backend:** Supabase (PostgreSQL).
- **Integrations:** Plaid (Banking), Venmo (via Plaid/Bank), Finicity or similar for detailed invest data.
- **State Management:** React Query for server state.

## Coding Standards
- **Strict Typing:** Use TypeScript for all financial calculations to avoid floating-point errors.
- **Currency Math:** NEVER use standard floats for money. Use a library like `dinero.js` or integer math (cents).
- **Components:** Functional components only. Use hooks for logic.

## Financial Logic Rules (The "Waterfall")
When generating recommendation logic, adhere to this priority order:
1. **Safety Net:** Ensure 3 months of expenses (calculated from trailing 12-month avg) are in High Yield Savings.
2. **Match:** Maximize Employer 401k Match (Priority #1).
3. **Debt:** High-interest debt (>7%) repayment.
4. **ESPP:** Maximize contribution if discount > 10% and immediate sell is available.
5. **RSU:** Treat vesting as cash bonuses; default suggestion is to diversify (sell-to-cover).

## Design

The overall goal is **approachable, warm, and minimal** — finance tracking should feel inviting, not clinical. Every design decision should favor clarity and scannability over decoration.

### Guiding Principles

**Numbers first, decoration second.** I come here to see dollar amounts. Borders, shadows, and labels exist to organize — never to compete with the data. If a decorative element draws the eye before the number does, remove it.

**Show real amounts, not abstract representations.** A number I can act on is always more useful than a shape I have to interpret. "$160 left" beats a 60% progress bar — no mental math required. Early versions used horizontal bars per budget category, but I caught myself computing "60% of $400 is... $240 spent..." every time. Removing the bars and showing the dollar amount directly made the UI faster to scan and more useful.

**Reserve visual intensity for things that need attention.** Saturated color is for actionable items — CTAs, anomalies, needs-review badges — not everyday list items. If everything is loud, nothing stands out. Early merchant avatars used bright filled circles with white initials. Every row competed for attention, so "needs review" badges disappeared into the noise. Switching to tinted circles — low-opacity category color background with colored text — made normal transactions visually quiet, so the things that actually need attention can do their job.

**Warm and approachable over corporate and sterile.** Finance tracking should feel like a helpful friend, not a bank statement. Warm cream backgrounds, friendly empty-state copy, and generous whitespace over cold grays and dense tables.

### Surface Treatment
- **Borders over shadows.** Use thin 1px borders at low opacity (`border-[#1F1410]/5`) for card edges. No `box-shadow` on content cards.
- **Background:** Warm cream `#FFFBF5` — never cool gray.
- **Corner radius:** `rounded-xl` (12px) for cards, `rounded-lg` (8px) for inputs and pills.
- **Borders are for structure, not emphasis.** They should be barely noticeable — just enough to define card edges without adding visual weight.

### Typography
- **Hero numbers:** Large (`text-4xl`), light weight (`font-light`). The number itself is the visual anchor — it doesn't need bold to stand out.
- **Page headers:** Small uppercase tracking-wide labels (`text-xs uppercase tracking-widest text-[#1F1410]/30`) above the hero number. Not bold titles with icons.
- **Body/row text:** `text-sm font-medium` for primary info, `text-xs text-[#1F1410]/40` for secondary.
- **Avoid redundant sub-labels.** If information is available elsewhere on the page (e.g., "monthly", "5 days left"), don't repeat it inside stat cards. Keep cards to label + number only.

### Stat Cards & Data Display
- **Separate cards per stat** (not grouped in one container). Each stat gets its own bordered card — easier to scan.
- **Card content:** Uppercase micro-label + single prominent number. No sub-text or secondary descriptors.
- **Stacked proportional bars** for budget breakdowns (needs/wants/savings) — shows relative allocation at a glance. Individual horizontal bars per category are acceptable when comparing against per-category budgets.

### Category & List Items
- **Card-per-row layout** with the category icon, name, spent/budget, and remaining amount.
- **Show category-specific icons** (from the icon map), not generic colored dots.
- **Display "$X left"** as the key metric — it's what the user actually wants to know.
- **No progress bars** in category lists. The remaining dollar amount is more informative.

### Transaction Rows
- **Compact density** (`py-2.5`) — prioritize seeing more transactions at once.
- **Avatar:** Letter initial of merchant name in a **subtly tinted circle** (low-opacity category color background, colored text) — NOT a filled/saturated circle. Saturated color avatars make every row scream for attention.
- **Metadata per row:** Merchant name, category pill (inline, tinted bg with category color), date, and source (e.g., "Chase Sapphire"). Source is important context for remembering transactions.
- **Negative sign:** Always show `-$XX.XX` for expenses.
- **Only highlight transactions that need attention** (needs_review, anomalies) with saturated color indicators. Normal transactions should be visually quiet.

### Selection & Interactive States
- **Selected category:** Left-edge color bar (`inset 3px 0 0 {color}`) + very subtle tinted background (`{color}06`). Subtle but clear.
- **Hover:** Light background shift only (`bg-[#1F1410]/[0.02]`). No scale transforms or shadow changes on content items.

### Modals & Forms
- **Stacked form layout** — label above input, one field per row (or 2-col grid for short fields like amount + category).
- **Labels:** Uppercase micro-labels (`text-[10px] uppercase tracking-wider`) above bordered inputs.
- **Input style:** `border border-[#1F1410]/10 rounded-lg` — simple bordered fields.

### Buttons & CTAs
- **Primary CTA:** Dark (`bg-[#1F1410]`) for form submissions and destructive confirmations. Colored teal (`bg-[#14B8A6]`) for onboarding/empty-state CTAs where approachability matters more.
- **Secondary:** Gray fill (`bg-[#1F1410]/5 text-[#1F1410]`). Clean and recessive.
- **Text links:** Plain text, no underline unless hovered. Keep minimal.

### Empty States
- **Warm and encouraging.** Use a single emoji in a tinted rounded container as the visual anchor.
- **Copy:** Brief and friendly — one line explaining what's missing, one line of guidance.
- **CTA:** Colored (teal) to feel approachable and inviting, not demanding.
- **Overall feel:** Minimal layout, generous whitespace. Don't over-explain.

### Color Palette (Warm & Earthy)
- **Amber** `#F59E0B` — dashboard, highlights
- **Green** `#10B981` — income, positive states, on-track
- **Red** `#FF6B6B` — over-budget, alerts
- **Violet** `#8B5CF6` — transactions, transfers
- **Teal** `#14B8A6` — primary accent, accounts, approachable CTAs
- **Text** `#1F1410` with opacity variants (`/60`, `/40`, `/30`) for hierarchy
- Use color at **low opacity for backgrounds** (`{color}10`, `{color}15`) and full saturation only for small indicators (dots, pills, badges) and CTAs.

## Design A/B Testing Workflow
When the user wants to explore design direction or refine taste on a topic (UI style, layout, component patterns, etc.):
1. Create a temporary tab/page with side-by-side A/B rendered options. Each round should be a **composite scene** testing 2-3 dimensions simultaneously (e.g., typography + border weight + card layout in one view) to maximize signal per round.
2. Include a small legend below each option listing what's being tested.
3. Collect the user's pick + reasoning for each round (4 rounds is a good target).
4. Synthesize preferences into concise, opinionated guidelines and encode them into the relevant section of CLAUDE.md.
5. Delete the temporary tab when done.

## Development Practices
- **Work incrementally.** Make one change at a time. Verify it works before moving on to the next. Don't stack multiple untested changes — if something breaks, it's harder to find which change caused it.
- **Check your work.** After making a change, run the dev server, tests, or linter as appropriate to confirm it behaves as expected. Don't assume it works because it looks right.
- **Read before you edit.** Understand the existing code before modifying it. Check how a function is used, what props a component expects, and what the data shape looks like.
- **Keep changes minimal and focused.** Only change what's needed for the task at hand. Unrelated cleanups, refactors, or "improvements" introduce risk and make review harder.
- **Test at the boundaries.** Verify edge cases — empty states, null values, zero amounts, negative numbers. Financial data is messy; don't assume clean inputs.
- **Don't swallow errors silently.** If something can fail, handle it visibly. A blank screen with no error message is worse than an ugly error.

## Database Migrations
- **Location:** `supabase/migrations/` — named with timestamp prefix (e.g., `20260329000000_description.sql`).
- **Apply locally:** `npx supabase db reset` (drops & recreates from all migrations) or `npx supabase migration up` (applies pending only).
- **Apply remote:** `npx supabase db push` (applies pending migrations to linked project).
- **Verify before pushing:** Run `npx supabase db push --dry-run` to preview what SQL will execute without applying.
- **Idempotent statements:** Always use `IF NOT EXISTS` / `IF EXISTS` so migrations can safely re-run.
- **Additive only:** Prefer adding nullable columns over renaming or dropping. Destructive changes (drop column, alter type) require careful coordination.
- **Never edit a pushed migration.** If a pushed migration needs correction, create a new migration to fix it.
- **Verify downstream impact before writing a migration.** Check triggers, functions, RLS policies, views, and any `SELECT *` queries that touch the affected table. Run `npx tsc --noEmit` and `npm test` after updating TypeScript types to catch breakage.
- **Test locally first** with `npx supabase db reset` before running `db push`.

## Security Guidelines
- **PII:** Never log PII (Personally Identifiable Information).
- **Secrets:** Use `process.env` for all keys. Never hardcode Plaid `client_id` or `secret`.
- **Token Exchange:** Always perform Plaid token exchange server-side, never client-side.