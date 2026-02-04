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
- [X] Create `goals` table (target_amount, current_amount, deadline)

## Phase 2: Sample Data & Page Scaffolding
- [x] Build CSV file upload for Bank transactions
- [x] Map transaction data schema to components
- [ ] Insert sample transactions (mixed categories)
- [ ] Insert sample paystub data
- [x] Insert default categories (via budgets table migration)
- [ ] Wire up each page to display its own data

## Phase 3: Income Page
- [x] Display paystub list with earnings breakdown (shows paychecks by date)
- [x] Fetch expected income from paystubs table
- [ ] Monthly take-home trends chart (Net Pay vs Gross Pay)
- [x] **Paystub PDF Import**:
    - [x] Integrate parser (PDF.js) to read paystub PDFs
    - [x] Extract "Net Pay" for Income Dashboard
    - [x] Extract "Deductions" (401k, ESPP, Taxes) for Savings Dashboard
    - [x] Build confirmation modal showing extracted fields for user review
    - [x] Build PDF preview to cross-compare fields with uploaded document
    - [x] Save paystub data to database on confirm

## Phase 4: Budget & Expenses Page
- [x] **Category Manager UI**:
    - [x] Create/edit categories with monthly limits
    - [x] Category icons and color picker
    - [x] Needs vs Wants separation with visual breakdown
- [ ] **CSV Import Verification**:
    - [ ] Build CSV preview modal before import
    - [ ] Show transaction count and date range summary
    - [ ] Display category mapping preview (merchant → category)
    - [ ] Allow bulk category assignment for unmapped merchants
    - [ ] Highlight unrecognized/new categories
    - [ ] Option to create new categories during import
    - [ ] Show duplicate detection (transactions already imported)
    - [ ] Confirm/cancel import after review
- [ ] **Transaction-to-Category Mapping**:
    - [ ] Build mapping engine for merchants to categories
    - [ ] Create "Rules" UI (e.g., "Always map 'Uber' to 'Transport'")
    - [ ] Save merchant-to-category mappings for future imports
    - [ ] Auto-apply saved mappings during CSV preview
- [x] **Expense Dashboard**:
    - [x] Aggregate transactions by category for current month
    - [x] Budget progress bars per category (e.g., $400 / $500 spent)
    - [x] Fetch budget limits from database
    - [x] Sync expected income from paystubs
- [ ] Over-budget alerts for exceeded limits

## Phase 5: Savings Page
- [ ] Display account balances from `accounts` table
- [ ] Track progress toward each goal
- [ ] **Goal Management**:
    - [ ] Edit active goals (name, target amount, deadline, icon, color)
    - [ ] Delete/archive completed or cancelled goals
    - [ ] Pause/resume goal contributions
    - [ ] Reorder goals by priority
    - [ ] Add manual contributions to goals

## Phase 6: Cross-Page Data Flow
- [x] Sync expected income across Income, Budget, and Expenses pages (from paystubs)
- [ ] Auto-log 401k/ESPP contributions from paystubs to savings progress
- [ ] Calculate "Unallocated Cash" (Income - Expenses)
- [ ] Recommend goal allocations based on "waterfall" rules:
    1. Safety Net (3 months expenses in HYSA)
    2. Maximize Employer 401k Match
    3. High-interest debt (>7%) repayment
    4. ESPP if discount >10% with immediate sell
    5. RSU diversification (sell-to-cover)

## Phase 7: Authentication & User Management
- [x] Add user_id columns and RLS policies to all tables
- [x] Create AuthContext and useUser hook
- [x] Build sign-in/sign-up UI (AuthView)
- [x] Add ProtectedRoute wrapper
- [x] Update all data operations to include user_id
- [ ] **Email Verification**:
    - [ ] Enable email confirmation in Supabase Dashboard
    - [ ] Create email verification pending screen
    - [ ] Handle "Email not confirmed" error state gracefully
    - [ ] Add "Resend verification email" button
    - [ ] Redirect to app after email confirmation
- [ ] **Password Management**:
    - [ ] Add "Forgot password" flow
    - [ ] Create password reset email template
    - [ ] Build password reset form
- [ ] **Session Management**:
    - [ ] Handle session expiration gracefully
    - [ ] Add "Remember me" option
    - [ ] Implement secure logout (clear all session data)

## Phase 8: Insights & Dashboard
- [x] Connect dashboard metrics to live data (total spent, expected income, days left)
- [ ] **Budget Status Card**:
    - [ ] Calculate actual budget status from transactions vs budgets
    - [ ] Show spending pace indicator (ahead/behind expected)
    - [ ] Add trend arrow comparing to previous month
- [ ] **Monthly Overview Grid**:
    - [ ] Populate monthly cards with actual spending data per month
    - [ ] Color-code months by budget status (under/over/on-track)
    - [ ] Show year-to-date totals
- [ ] **Quick Stats Cards**:
    - [ ] Daily average spending (actual calculation)
    - [ ] Projected month-end total based on spending pace
    - [ ] Savings rate (income - expenses / income)
- [ ] **Spending Insights**:
    - [ ] Top spending categories this month
    - [ ] Biggest transactions this month
    - [ ] Category spending vs last month comparison
    - [ ] Unusual spending alerts (e.g., "Dining 40% higher than usual")
- [ ] **Income Insights**:
    - [ ] Income trends over time
    - [ ] Paycheck-to-paycheck breakdown
    - [ ] Tax withholding summary
- [ ] **Goal Progress Cards**:
    - [ ] Show active savings goals on dashboard
    - [ ] Progress bars with projected completion dates
    - [ ] Contribution suggestions based on remaining budget

## Phase 9: Live Automation (Plaid)
- [ ] Link bank accounts via Plaid Transactions API
- [ ] Sync investment account balances (401k/Brokerage)
- [ ] Replace CSV import with live transaction sync
- [ ] Update "Net Worth" with real-time data
