import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  month: z.string().describe('Month to query (YYYY-MM-DD, first of month)'),
  budgetType: z.enum(['need', 'want']).optional().describe('Filter by category type'),
})

export function getCategorySpendingTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Get spending broken down by category for a specific month, optionally filtered by budget type (need/want).',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ month, budgetType }: z.infer<typeof inputSchema>) => {
      const query = supabase
        .from('monthly_category_summaries')
        .select('*, categories(name, category_type, icon, color)')
        .eq('user_id', userId)
        .eq('month', month)

      const { data, error } = await query

      if (error) return { error: error.message }

      let results = (data || []).map((r: any) => ({
        category: r.categories?.name || 'Unknown',
        categoryType: r.categories?.category_type,
        totalSpending: r.total_spending || 0,
        transactionCount: r.transaction_count || 0,
      }))

      if (budgetType) {
        results = results.filter(r => r.categoryType === budgetType)
      }

      return results.sort((a, b) => b.totalSpending - a.totalSpending)
    },
  })
}
