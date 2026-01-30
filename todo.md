# Finance App Build Roadmap

## Phase 1: Database Schemas
- [x] **Configure Magic Patterns MCP**: Scaffold React + Tailwind structure
- [x] Create `transactions` table (date, amount, merchant, category_id)
- [x] Create `paystubs` table (net_pay, gross_pay, 401k_contrib, espp_contrib, rsu_vest, pay_date)
- [ ] Create `accounts` table (balance starts at 0 until user configures)
    - account_type: 'checking', 'savings', 'hysa', '401k', 'brokerage', 'espp'
    - institution_name, account_name
    - current_balance, available_balance (default 0)
    - plaid_account_id (for future Plaid linking)
- [x] Create `budgets` table (monthly_limit, budget_type: need/want, flexibility: fixed/variable, icon, color)
- [x] Connect BudgetView to database (fetch, update, create categories)
- [ ] Create `goals` table (target_amount, current_amount, deadline)

## Phase 2: Sample Data & Page Scaffolding
- [x] Build CSV file upload for Bank transactions
- [x] Map transaction data schema to components
- [ ] Insert sample transactions (mixed categories)
- [ ] Insert sample paystub data
- [x] Insert default categories (via budgets table migration)
- [ ] Wire up each page to display its own data

## Phase 3: Income Page
- [ ] Display paystub list with earnings breakdown
- [ ] Monthly take-home trends chart (Net Pay vs Gross Pay)
- [ ] **Paystub PDF Import**:
    - [ ] Integrate parser (PDF.js or AI service) to read paystub PDFs
    - [ ] Extract "Net Pay" for Income Dashboard
    - [ ] Extract "Deductions" (401k, ESPP, Taxes) for Savings Dashboard
    - [ ] Build confirmation modal showing extracted fields for user review
    - [ ] Build PDF preview to cross-compare fields with uploaded document

## Phase 4: Budget & Expenses Page
- [x] **Category Manager UI**:
    - [x] Create/edit categories with monthly limits
    - [x] Category icons and color picker
    - [x] Needs vs Wants separation with visual breakdown
- [ ] **Transaction-to-Category Mapping**:
    - [ ] Build mapping engine for merchants to categories
    - [ ] Create "Rules" UI (e.g., "Always map 'Uber' to 'Transport'")
- [ ] **Expense Dashboard**:
    - [ ] Aggregate transactions by category for current month
    - [ ] Budget progress bars per category (e.g., $400 / $500 spent)
- [ ] Over-budget alerts for exceeded limits

## Phase 5: Savings Page
- [ ] **Goal Setup UI**: Define targets (Emergency Fund, Wedding, Vacation, etc.)
- [ ] Display account balances from `accounts` table
- [ ] Track progress toward each goal

## Phase 6: Cross-Page Data Flow
- [ ] Auto-log 401k/ESPP contributions from paystubs to savings progress
- [ ] Calculate "Unallocated Cash" (Income - Expenses)
- [ ] Recommend goal allocations based on "waterfall" rules:
    1. Safety Net (3 months expenses in HYSA)
    2. Maximize Employer 401k Match
    3. High-interest debt (>7%) repayment
    4. ESPP if discount >10% with immediate sell
    5. RSU diversification (sell-to-cover)

## Phase 7: Live Automation (Plaid)
- [ ] Link bank accounts via Plaid Transactions API
- [ ] Sync investment account balances (401k/Brokerage)
- [ ] Replace CSV import with live transaction sync
- [ ] Update "Net Worth" with real-time data
