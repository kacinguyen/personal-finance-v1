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

## Security Guidelines
- **PII:** Never log PII (Personally Identifiable Information).
- **Secrets:** Use `process.env` for all keys. Never hardcode Plaid `client_id` or `secret`.
- **Token Exchange:** Always perform Plaid token exchange server-side, never client-side.