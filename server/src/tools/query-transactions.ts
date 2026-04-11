import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  startDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
  endDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
  merchant: z.string().optional().describe('Merchant name to search (partial match)'),
  category: z.string().optional().describe('Category name to filter by'),
  minAmount: z.number().optional().describe('Minimum absolute amount'),
  maxAmount: z.number().optional().describe('Maximum absolute amount'),
  limit: z.number().default(20).describe('Max results to return'),
})

export function queryTransactionsTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Search and filter the user\'s transactions by date range, merchant, category, or amount.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ startDate, endDate, merchant, category, minAmount, maxAmount, limit }: z.infer<typeof inputSchema>) => {
      let query = supabase
        .from('transactions')
        .select('*, categories(name, category_type)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit)

      if (startDate) query = query.gte('date', startDate)
      if (endDate) query = query.lte('date', endDate)
      if (merchant) query = query.ilike('merchant', `%${merchant}%`)
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

      let results = data || []

      if (minAmount !== undefined) {
        results = results.filter((t: any) => Math.abs(t.amount) >= minAmount)
      }
      if (maxAmount !== undefined) {
        results = results.filter((t: any) => Math.abs(t.amount) <= maxAmount)
      }

      return results.map((t: any) => ({
        id: t.id,
        date: t.date,
        merchant: t.merchant,
        amount: t.amount,
        category: t.categories?.name || 'Uncategorized',
        categoryType: t.categories?.category_type,
        source: t.source,
        needsReview: t.needs_review,
      }))
    },
  })
}
