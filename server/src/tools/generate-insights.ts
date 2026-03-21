import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  focus: z
    .enum(['all', 'spending', 'budgets', 'trends'])
    .default('all')
    .describe('Which insights to focus on. Use "all" for a general check-in.'),
})

type SpendingVelocity = {
  totalSpentSoFar: number
  projectedTotal: number
  threeMonthAvg: number
  delta: number
  deltaPercent: number
  daysElapsed: number
  daysRemaining: number
  status: 'over_pace' | 'under_pace' | 'on_pace'
}

type CategorySpike = {
  category: string
  currentSpend: number
  avgSpend: number
  delta: number
  deltaPercent: number
}

type TopMerchant = {
  merchant: string
  totalSpent: number
  transactionCount: number
}

type BudgetPacing = {
  category: string
  budgetType: string
  limit: number
  spent: number
  remaining: number
  dailyBurnRate: number
  projectedSpend: number
  willExceed: boolean
}

type SavingsRate = {
  currentRate: number
  trailingAvgRate: number
  currentNetSavings: number
  currentIncome: number
}

type NetWorthTrend = {
  months: { month: string; netWorth: number }[]
  threeMonthChange: number
}

type InsightsResult = {
  spendingVelocity?: SpendingVelocity
  categorySpikes?: CategorySpike[]
  topMerchants?: TopMerchant[]
  budgetPacing?: BudgetPacing[]
  savingsRate?: SavingsRate
  netWorthTrend?: NetWorthTrend
}

function getMonthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function getTrailingMonthKeys(count: number): string[] {
  const now = new Date()
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(getMonthKey(d))
  }
  return keys
}

export function generateInsightsTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description:
      'Generate a batch of financial insights including spending velocity, category spikes vs. averages, top merchants, budget pacing, savings rate, and net worth trends. Use when giving a financial check-in or when the user asks about spending patterns, trends, or insights.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ focus }: z.infer<typeof inputSchema>) => {
      const monthKeys = getTrailingMonthKeys(4) // current + 3 trailing
      const currentMonthKey = monthKeys[0]
      const trailingKeys = monthKeys.slice(1)
      const now = new Date()
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
      const daysElapsed = now.getDate()
      const daysRemaining = daysInMonth - daysElapsed

      // Get expense category IDs (need/want only, exclude income/transfer)
      const { data: expenseCats } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .in('category_type', ['need', 'want'])

      const expenseCatIds = (expenseCats || []).map(c => c.id)

      // Parallel queries
      const [summariesRes, catSummariesRes, transactionsRes, budgetsRes] = await Promise.all([
        supabase
          .from('monthly_summaries')
          .select('*')
          .eq('user_id', userId)
          .in('month', monthKeys)
          .order('month', { ascending: false }),
        supabase
          .from('monthly_category_summaries')
          .select('*, categories(name, category_type)')
          .eq('user_id', userId)
          .in('month', monthKeys),
        supabase
          .from('transactions')
          .select('merchant, amount, category_id, categories(name)')
          .eq('user_id', userId)
          .gte('date', currentMonthKey)
          .lt('amount', 0)
          .in('category_id', expenseCatIds), // exclude income/transfer
        supabase
          .from('budgets')
          .select('*, categories(name)')
          .eq('user_id', userId)
          .eq('is_active', true),
      ])

      const summaries = summariesRes.data || []
      const catSummaries = catSummariesRes.data || []
      const transactions = transactionsRes.data || []
      const budgetRows = budgetsRes.data || []

      const currentSummary = summaries.find((s: any) => s.month === currentMonthKey)
      const trailingSummaries = summaries.filter((s: any) => s.month !== currentMonthKey)

      const result: InsightsResult = {}

      // --- Spending Velocity ---
      if (focus === 'all' || focus === 'spending') {
        const totalSpent = currentSummary?.total_spending || 0
        const dailyRate = daysElapsed > 0 ? totalSpent / daysElapsed : 0
        const projectedTotal = Math.round(dailyRate * daysInMonth)
        const threeMonthAvg =
          trailingSummaries.length > 0
            ? Math.round(
                trailingSummaries.reduce((s: number, r: any) => s + (r.total_spending || 0), 0) /
                  trailingSummaries.length,
              )
            : 0

        const delta = projectedTotal - threeMonthAvg
        const deltaPercent = threeMonthAvg > 0 ? Math.round((delta / threeMonthAvg) * 100) : 0

        let status: SpendingVelocity['status'] = 'on_pace'
        if (deltaPercent > 10) status = 'over_pace'
        else if (deltaPercent < -10) status = 'under_pace'

        result.spendingVelocity = {
          totalSpentSoFar: Math.round(totalSpent),
          projectedTotal,
          threeMonthAvg,
          delta,
          deltaPercent,
          daysElapsed,
          daysRemaining,
          status,
        }
      }

      // --- Category Spikes ---
      if (focus === 'all' || focus === 'spending') {
        const currentCats = catSummaries.filter((c: any) => c.month === currentMonthKey)
        const trailingCats = catSummaries.filter((c: any) => c.month !== currentMonthKey)

        // Compute trailing averages per category
        const catAvgMap = new Map<string, { totalSpend: number; monthCount: number }>()
        for (const tc of trailingCats) {
          const name = (tc as any).categories?.name || 'Unknown'
          const existing = catAvgMap.get(name) || { totalSpend: 0, monthCount: 0 }
          existing.totalSpend += tc.total_spending || 0
          existing.monthCount = Math.max(existing.monthCount, trailingKeys.length)
          catAvgMap.set(name, existing)
        }

        const spikes: CategorySpike[] = []
        for (const cc of currentCats) {
          const name = (cc as any).categories?.name || 'Unknown'
          const currentSpend = cc.total_spending || 0
          const avg = catAvgMap.get(name)
          const avgSpend = avg ? Math.round(avg.totalSpend / trailingKeys.length) : 0

          if (avgSpend > 0) {
            const delta = currentSpend - avgSpend
            const deltaPercent = Math.round((delta / avgSpend) * 100)

            // Flag if >30% increase AND >$50 absolute increase
            if (deltaPercent > 30 && delta > 50) {
              spikes.push({
                category: name,
                currentSpend: Math.round(currentSpend),
                avgSpend,
                delta: Math.round(delta),
                deltaPercent,
              })
            }
          }
        }

        result.categorySpikes = spikes.sort((a, b) => b.delta - a.delta)
      }

      // --- Top Merchants ---
      if (focus === 'all' || focus === 'spending') {
        const merchantMap = new Map<string, { total: number; count: number }>()
        for (const t of transactions) {
          const name = t.merchant || 'Unknown'
          const existing = merchantMap.get(name) || { total: 0, count: 0 }
          existing.total += Math.abs(t.amount || 0)
          existing.count += 1
          merchantMap.set(name, existing)
        }

        const sorted = Array.from(merchantMap.entries())
          .map(([merchant, data]) => ({
            merchant,
            totalSpent: Math.round(data.total),
            transactionCount: data.count,
          }))
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5)

        result.topMerchants = sorted
      }

      // --- Budget Pacing ---
      if (focus === 'all' || focus === 'budgets') {
        // Get current month category spending
        const currentCats = catSummaries.filter((c: any) => c.month === currentMonthKey)
        const catSpendMap = new Map<string, number>()
        for (const cc of currentCats) {
          catSpendMap.set(cc.category_id, cc.total_spending || 0)
        }

        const pacing: BudgetPacing[] = []
        for (const b of budgetRows) {
          const limit = b.monthly_limit || 0
          const spent = catSpendMap.get(b.category_id) || 0
          const remaining = limit - spent
          const dailyBurnRate = daysElapsed > 0 ? spent / daysElapsed : 0
          const projectedSpend = Math.round(dailyBurnRate * daysInMonth)
          const willExceed = projectedSpend > limit

          pacing.push({
            category: b.categories?.name || 'Unknown',
            budgetType: b.budget_type || 'want',
            limit: Math.round(limit),
            spent: Math.round(spent),
            remaining: Math.round(remaining),
            dailyBurnRate: Math.round(dailyBurnRate * 100) / 100,
            projectedSpend,
            willExceed,
          })
        }

        // Sort: exceeded/will-exceed first, then by overage amount
        result.budgetPacing = pacing.sort((a, b) => {
          if (a.willExceed !== b.willExceed) return a.willExceed ? -1 : 1
          return a.remaining - b.remaining
        })
      }

      // --- Savings Rate ---
      if (focus === 'all' || focus === 'trends') {
        const currentIncome = currentSummary?.total_income || 0
        const currentNetSavings = currentSummary?.net_savings || 0
        const currentRate = currentIncome > 0 ? Math.round((currentNetSavings / currentIncome) * 100) : 0

        const trailingRates = trailingSummaries
          .filter((s: any) => s.total_income > 0)
          .map((s: any) => (s.net_savings / s.total_income) * 100)
        const trailingAvgRate =
          trailingRates.length > 0
            ? Math.round(trailingRates.reduce((a: number, b: number) => a + b, 0) / trailingRates.length)
            : 0

        result.savingsRate = {
          currentRate,
          trailingAvgRate,
          currentNetSavings: Math.round(currentNetSavings),
          currentIncome: Math.round(currentIncome),
        }
      }

      // --- Net Worth Trend ---
      if (focus === 'all' || focus === 'trends') {
        const months = summaries
          .filter((s: any) => s.net_worth != null)
          .map((s: any) => ({
            month: s.month,
            netWorth: Math.round(s.net_worth || 0),
          }))
          .sort((a: any, b: any) => a.month.localeCompare(b.month))

        const threeMonthChange =
          months.length >= 2 ? months[months.length - 1].netWorth - months[0].netWorth : 0

        result.netWorthTrend = { months, threeMonthChange }
      }

      return result
    },
  })
}
