export type MonthlySummary = {
  id: string
  user_id: string
  month: string // ISO date, always first of month (YYYY-MM-DD)

  // Income
  total_income: number
  salary_income: number
  other_income: number

  // Spending (absolute values)
  total_spending: number
  needs_spending: number
  wants_spending: number
  transfers_total: number

  // Derived
  net_savings: number
  transaction_count: number

  // Budget snapshots
  total_budget: number
  needs_budget: number
  wants_budget: number

  // Paystub aggregates
  paystub_gross: number
  paystub_net: number
  paystub_401k: number
  paystub_employer_match: number
  paystub_hsa: number
  paystub_espp: number

  // Net worth snapshot
  net_worth: number
  total_assets: number
  total_liabilities: number

  // Metadata
  computed_at: string
}

export type MonthlyCategorySummary = {
  id: string
  user_id: string
  month: string
  category_id: string
  category_type: 'need' | 'want' | 'income' | 'transfer'
  total_amount: number
  transaction_count: number
  budget_amount: number | null
  computed_at: string
}
