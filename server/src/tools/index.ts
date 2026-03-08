import type { SupabaseClient } from '@supabase/supabase-js'
import { queryTransactionsTool } from './query-transactions.js'
import { getMonthlySummaryTool } from './get-monthly-summary.js'
import { getCategorySpendingTool } from './get-category-spending.js'
import { getAccountsTool } from './get-accounts.js'
import { getBudgetsTool } from './get-budgets.js'
import { getGoalsTool } from './get-goals.js'
import { getPaystubsTool } from './get-paystubs.js'
import { runWaterfallTool } from './run-waterfall.js'
import { allocatePaycheckTool } from './allocate-paycheck.js'

export function createTools(supabase: SupabaseClient, userId: string) {
  return {
    query_transactions: queryTransactionsTool(supabase, userId),
    get_monthly_summary: getMonthlySummaryTool(supabase, userId),
    get_category_spending: getCategorySpendingTool(supabase, userId),
    get_accounts: getAccountsTool(supabase, userId),
    get_budgets: getBudgetsTool(supabase, userId),
    get_goals: getGoalsTool(supabase, userId),
    get_paystubs: getPaystubsTool(supabase, userId),
    run_waterfall: runWaterfallTool(supabase, userId),
    allocate_paycheck: allocatePaycheckTool(supabase, userId),
  }
}
