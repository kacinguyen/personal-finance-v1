# Finance App Build Roadmap

# Finance App Build Roadmap (Page-Based Approach)

## Phase 1: Foundation & Transaction Data
- [x] **Configure Magic Patterns MCP**: Scaffold React + Tailwind structure
- [ ] **Initialize Database Schema (Supabase)**
    - [X] Create `transactions` table (date, amount, merchant, category_id)
- [ ] **Transaction Importer (CSV)**
    - [X] Build file upload for Bank CSVs
    - [X] Map data schema to components
    <!-- - [ ] Implement "Schema Mapper" to standardize columns from different banks -->

## Phase 2: Income Page (The "Source")
- [ ] **Initialize Database Schema (Supabase)**
    - [X] Create `paystubs` table (net_pay, gross_pay, 401k_contrib, espp_contrib, rsu_vest, pay_date)
- [ ] **Paystub Parser (OCR/PDF)**
    - [ ] Integrate a parser (e.g., PDF.js or an AI service) to read paystub PDFs
    - [ ] **Logic:** Extract "Net Pay" for the *Income Dashboard*
    - [ ] **Logic:** Extract "Deductions" (401k, ESPP, Taxes) for the *Savings Dashboard*
    - [ ] Build a confirmation modal showing extracted and mapped fields for user to confirm
    - [ ] Build PDF preview to cross-compare each field with the uploaded document
        - [ ] Zoom in on doc preview
        - [ ] Highlight relevant field
- [ ] **Income Dashboard UI**: Display monthly take-home trends vs Gross Pay

## Phase 3: Budget Setup & Category Mapping
- [ ] **Category Manager**:
    - [ ] Create `categories` table with `monthly_limit` column
    - [ ] Build UI to create/edit categories (e.g., "Dining," "Utilities")
- [ ] **Mapping Engine**:
    - [ ] Build logic to map imported Transaction merchants to Categories
    - [ ] Create "Rules" UI (e.g., "Always map 'Uber' to 'Transport'")

## Phase 4: Expenses Page (Tracking)
- [ ] **Expense Dashboard**:
    - [ ] **Logic:** Aggregate transactions by category for the current month
    - [ ] **Visual:** "Progress Bars" for each budget category (e.g., $400 / $500 spent)
- [ ] **Alerts**: Highlight categories that have exceeded defined limits

## Phase 5: Savings Page & Goal Allocation
- [ ] **Goal Setup**: UI to define targets (e.g., "Emergency Fund: $15k", "Wedding: $30k")
- [ ] **Asset Allocation Logic**:
    - [ ] Auto-log 401k/ESPP contributions from Phase 2 (Paystubs) as "Savings Progress"
    - [ ] Calculate "Unallocated Cash" (Income - Expenses)
    - [ ] Suggest distribution of unallocated cash into specific goals

## Phase 6: Live Automation (Plaid)
- [ ] **Link Bank Accounts**: Replace CSV upload with Plaid Transactions API
- [ ] **Link Investment Accounts**: Sync current balances for 401k/Brokerage to update "Net Worth"