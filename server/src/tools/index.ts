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
import { generateInsightsTool } from './generate-insights.js'
import { compareMonthsTool } from './compare-months.js'
import { getTopMerchantsTool } from './get-top-merchants.js'
import { updateTransactionNoteTool } from './update-transaction-note.js'
import { recategorizeTransactionTool } from './recategorize-transaction.js'
import { splitWithOthersTool } from './split-with-others.js'
import { createExpectedReturnTool } from './create-expected-return.js'
import { resolveExpectedReturnTool } from './resolve-expected-return.js'
import { gatherBudgetContextTool } from './gather-budget-context.js'
import { addBudgetNoteTool } from './add-budget-note.js'
import { applyBudgetRecommendationsTool } from './apply-budget-recommendations.js'
import { proposeBudgetChangesTool } from './propose-budget-changes.js'

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
    generate_insights: generateInsightsTool(supabase, userId),
    compare_months: compareMonthsTool(supabase, userId),
    get_top_merchants: getTopMerchantsTool(supabase, userId),
    update_transaction_note: updateTransactionNoteTool(supabase, userId),
    recategorize_transaction: recategorizeTransactionTool(supabase, userId),
    split_with_others: splitWithOthersTool(supabase, userId),
    create_expected_return: createExpectedReturnTool(supabase, userId),
    resolve_expected_return: resolveExpectedReturnTool(supabase, userId),
    gather_budget_context: gatherBudgetContextTool(supabase, userId),
    add_budget_note: addBudgetNoteTool(supabase, userId),
    apply_budget_recommendations: applyBudgetRecommendationsTool(supabase, userId),
    propose_budget_changes: proposeBudgetChangesTool(supabase, userId),
  }
}
