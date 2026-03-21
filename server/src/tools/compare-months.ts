import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  monthA: z.string().describe('First month to compare (YYYY-MM-DD, first of month)'),
  monthB: z.string().describe('Second month to compare (YYYY-MM-DD, first of month)'),
  includeCategories: z.boolean().default(true).describe('Include per-category comparison'),
})

type MonthData = {
  month: string
  income: number
  spending: number
  needs: number
  wants: number
  netSavings: number
  netWorth: number
}

type CategoryComparison = {
  category: string
  categoryType: string
  monthA: number
  monthB: number
  delta: number
  deltaPercent: number
}

export function compareMonthsTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description:
      'Compare two months side-by-side with pre-computed deltas for income, spending, savings, and per-category breakdowns. Use when the user asks how this month compares to a previous month.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ monthA, monthB, includeCategories }: z.infer<typeof inputSchema>) => {
      const summariesPromise = supabase
        .from('monthly_summaries')
        .select('*')
        .eq('user_id', userId)
        .in('month', [monthA, monthB])

      const catPromise = includeCategories
        ? supabase
            .from('monthly_category_summaries')
            .select('*, categories(name, category_type)')
            .eq('user_id', userId)
            .in('month', [monthA, monthB])
        : null

      const [summariesRes, catRes] = await Promise.all([
        summariesPromise,
        catPromise,
      ])

      const summaries = summariesRes.data || []
      const catSummaries = catRes?.data || []

      const sumA = summaries.find((s: any) => s.month === monthA)
      const sumB = summaries.find((s: any) => s.month === monthB)

      if (!sumA && !sumB) {
        return { error: 'No data found for either month.' }
      }

      function extract(s: any): MonthData {
        return {
          month: s?.month || '',
          income: s?.total_income || 0,
          spending: s?.total_spending || 0,
          needs: s?.needs_spending || 0,
          wants: s?.wants_spending || 0,
          netSavings: s?.net_savings || 0,
          netWorth: s?.net_worth || 0,
        }
      }

      const dataA = extract(sumA)
      const dataB = extract(sumB)

      function delta(a: number, b: number) {
        return {
          change: Math.round(b - a),
          percentChange: a > 0 ? Math.round(((b - a) / a) * 100) : 0,
        }
      }

      const comparison = {
        monthA: dataA,
        monthB: dataB,
        deltas: {
          income: delta(dataA.income, dataB.income),
          spending: delta(dataA.spending, dataB.spending),
          needs: delta(dataA.needs, dataB.needs),
          wants: delta(dataA.wants, dataB.wants),
          netSavings: delta(dataA.netSavings, dataB.netSavings),
          netWorth: delta(dataA.netWorth, dataB.netWorth),
        },
        categories: undefined as CategoryComparison[] | undefined,
      }

      if (includeCategories) {
        const catsA = catSummaries.filter((c: any) => c.month === monthA)
        const catsB = catSummaries.filter((c: any) => c.month === monthB)

        // Build map of all categories across both months
        const allCats = new Map<string, { type: string; a: number; b: number }>()

        for (const c of catsA) {
          const name = c.categories?.name || 'Unknown'
          allCats.set(name, {
            type: c.categories?.category_type || 'unknown',
            a: c.total_spending || 0,
            b: 0,
          })
        }

        for (const c of catsB) {
          const name = c.categories?.name || 'Unknown'
          const existing = allCats.get(name) || { type: c.categories?.category_type || 'unknown', a: 0, b: 0 }
          existing.b = c.total_spending || 0
          allCats.set(name, existing)
        }

        comparison.categories = Array.from(allCats.entries())
          .map(([category, data]) => ({
            category,
            categoryType: data.type,
            monthA: Math.round(data.a),
            monthB: Math.round(data.b),
            delta: Math.round(data.b - data.a),
            deltaPercent: data.a > 0 ? Math.round(((data.b - data.a) / data.a) * 100) : 0,
          }))
          .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      }

      return comparison
    },
  })
}
