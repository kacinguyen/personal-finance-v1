import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  month: z.string().describe('Month to query (YYYY-MM-DD, first of month)'),
})

export function getMonthlySummaryTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Get a detailed monthly financial summary including income, spending, savings, and net worth for a specific month.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ month }: z.infer<typeof inputSchema>) => {
      const { data, error } = await supabase
        .from('monthly_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .single()

      if (error) return { error: error.message }
      if (!data) return { error: 'No summary found for this month' }

      return {
        month: data.month,
        income: { total: data.total_income, salary: data.salary_income, other: data.total_income - data.salary_income },
        spending: { total: data.total_spending, needs: data.needs_spending, wants: data.wants_spending, goalFunded: data.goal_funded_spending },
        netSavings: data.net_savings,
        transactionCount: data.transaction_count,
        budget: { total: data.total_budget, needs: data.needs_budget, wants: data.wants_budget },
        paystub: { gross: data.paystub_gross, net: data.paystub_net, contributions401k: data.paystub_401k, employerMatch: data.paystub_employer_match, hsa: data.paystub_hsa, espp: data.paystub_espp },
        netWorth: data.net_worth,
        totalAssets: data.total_assets,
        totalLiabilities: data.total_liabilities,
      }
    },
  })
}
