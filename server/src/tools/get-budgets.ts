import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({})

export function getBudgetsTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Get all active budgets with their monthly limits and current spending.',
    inputSchema: zodSchema(inputSchema),
    execute: async () => {
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

      const [budgetsRes, spendingRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('*, categories(name)')
          .eq('user_id', userId)
          .eq('is_active', true),
        supabase
          .from('monthly_category_summaries')
          .select('*')
          .eq('user_id', userId)
          .eq('month', currentMonth),
      ])

      if (budgetsRes.error) return { error: budgetsRes.error.message }

      const spendMap = new Map<string, number>()
      for (const s of spendingRes.data || []) {
        spendMap.set(s.category_id, s.total_spending || 0)
      }

      return (budgetsRes.data || []).map((b: any) => ({
        category: b.categories?.name || b.category,
        budgetType: b.budget_type,
        monthlyLimit: b.monthly_limit,
        spent: spendMap.get(b.category_id) || 0,
        remaining: b.monthly_limit - (spendMap.get(b.category_id) || 0),
        flexibility: b.flexibility,
      }))
    },
  })
}
