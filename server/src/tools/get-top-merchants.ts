import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD). Defaults to first of current month.'),
  endDate: z.string().optional().describe('End date (YYYY-MM-DD). Defaults to today.'),
  limit: z.number().default(10).describe('Max merchants to return'),
  category: z.string().optional().describe('Filter by category name (partial match)'),
})

export function getTopMerchantsTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description:
      'Get the top merchants by total spending for a date range. Aggregates transactions by merchant name and returns totals sorted by amount.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ startDate, endDate, limit, category }: z.infer<typeof inputSchema>) => {
      const now = new Date()
      const defaultStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      const defaultEnd = now.toISOString().split('T')[0]
      // Get expense category IDs (need/want only, exclude income/transfer)
      const { data: expenseCats } = await supabase
        .from('categories')
        .select('id')
        .eq('user_id', userId)
        .in('category_type', ['need', 'want'])

      const expenseCatIds = (expenseCats || []).map(c => c.id)

      let query = supabase
        .from('transactions')
        .select('merchant, amount, date, categories(name)')
        .eq('user_id', userId)
        .gte('date', startDate || defaultStart)
        .lte('date', endDate || defaultEnd)
        .lt('amount', 0)
        .in('category_id', expenseCatIds)

      if (category) {
        const { data: cats } = await supabase
          .from('categories')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', `%${category}%`)
        if (cats && cats.length > 0) {
          query = query.in('category_id', cats.map(c => c.id))
        }
      }

      const { data, error } = await query

      if (error) return { error: error.message }

      const transactions = data || []

      // Aggregate by merchant
      const merchantMap = new Map<string, { total: number; count: number; lastDate: string }>()
      for (const t of transactions) {
        const name = t.merchant || 'Unknown'
        const existing = merchantMap.get(name) || { total: 0, count: 0, lastDate: '' }
        existing.total += Math.abs(t.amount || 0)
        existing.count += 1
        if (t.date > existing.lastDate) existing.lastDate = t.date
        merchantMap.set(name, existing)
      }

      const result = Array.from(merchantMap.entries())
        .map(([merchant, data]) => ({
          merchant,
          totalSpent: Math.round(data.total),
          transactionCount: data.count,
          lastDate: data.lastDate,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, limit)
      return result
    },
  })
}
