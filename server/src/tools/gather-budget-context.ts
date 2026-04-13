import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { projectMonthlyIncome } from '../engine/project-income.js'

const inputSchema = z.object({
  targetMonth: z
    .string()
    .describe('The month to suggest budgets for (YYYY-MM-DD, first of month)'),
})

function monthOffset(month: string, offset: number): string {
  const d = new Date(month + 'T00:00:00')
  const shifted = new Date(d.getFullYear(), d.getMonth() + offset, 1)
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-01`
}

export function gatherBudgetContextTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description:
      'Gather all data needed to recommend budget adjustments for a target month: current budgets, last month spending, prior-year seasonality, trailing averages, expected income, and user-provided budget notes. Use this when the user asks to suggest, optimize, or adjust budgets.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ targetMonth }: z.infer<typeof inputSchema>) => {
      const lastMonth = monthOffset(targetMonth, -1)
      const priorYearSameMonth = monthOffset(targetMonth, -12)
      const trailingMonths = [monthOffset(targetMonth, -1), monthOffset(targetMonth, -2), monthOffset(targetMonth, -3)]

      // Run all queries in parallel
      const [
        budgetsRes,
        lastMonthSpendingRes,
        priorYearSpendingRes,
        trailingSpendingRes,
        budgetNotesRes,
        incomeResult,
      ] = await Promise.all([
        // Current budgets with category info (including parent_id for hierarchy)
        supabase
          .from('budgets')
          .select('id, category_id, monthly_limit, budget_type, flexibility, categories(name, category_type, parent_id)')
          .eq('user_id', userId)
          .eq('is_active', true),

        // Last month per-category spending
        supabase
          .from('monthly_category_summaries')
          .select('category_id, total_amount, categories(name, category_type)')
          .eq('user_id', userId)
          .eq('month', lastMonth),

        // Prior year same month spending
        supabase
          .from('monthly_category_summaries')
          .select('category_id, total_amount, categories(name, category_type)')
          .eq('user_id', userId)
          .eq('month', priorYearSameMonth),

        // Trailing 3 months for averages
        supabase
          .from('monthly_category_summaries')
          .select('category_id, month, total_amount, categories(name, category_type)')
          .eq('user_id', userId)
          .in('month', trailingMonths),

        // Budget notes for target month
        supabase
          .from('budget_notes')
          .select('note, estimated_amount, category_id, categories(name)')
          .eq('user_id', userId)
          .eq('target_month', targetMonth)
          .eq('is_active', true),

        // Expected income projection
        projectMonthlyIncome(supabase, userId, targetMonth),
      ])

      // Build current budgets with hierarchy info
      const allBudgetRows = budgetsRes.data || []
      // Identify parent category IDs (categories that have children pointing to them)
      const childParentIds = new Set(
        allBudgetRows
          .filter((b: any) => b.categories?.parent_id)
          .map((b: any) => b.category_id === b.categories?.parent_id ? null : b.categories?.parent_id)
          .filter(Boolean),
      )
      // Also check: any category_id that appears as another row's parent_id
      const allCatIds = new Map(allBudgetRows.map((b: any) => [b.category_id, b]))
      const parentCatIds = new Set(
        allBudgetRows
          .filter((b: any) => b.categories?.parent_id && allCatIds.has(b.categories.parent_id))
          .map((b: any) => b.categories.parent_id),
      )

      const currentBudgets = allBudgetRows.map((b: any) => {
        const isParent = parentCatIds.has(b.category_id)
        const parentRow = b.categories?.parent_id ? allCatIds.get(b.categories.parent_id) : null
        return {
          budgetId: b.id,
          category: b.categories?.name || 'Unknown',
          categoryType: b.categories?.category_type || b.budget_type,
          limit: Number(b.monthly_limit),
          flexibility: b.flexibility,
          isParent,
          parentCategory: parentRow?.categories?.name || null,
        }
      })

      // Last month spending by category
      const lastMonthSpending = (lastMonthSpendingRes.data || []).map((r: any) => ({
        category: r.categories?.name || 'Unknown',
        categoryType: r.categories?.category_type,
        spent: Number(r.total_amount) || 0,
      }))

      // Prior year same month
      const priorYearSpending = (priorYearSpendingRes.data || []).map((r: any) => ({
        category: r.categories?.name || 'Unknown',
        categoryType: r.categories?.category_type,
        spent: Number(r.total_amount) || 0,
      }))

      // Trailing 3-month averages
      const trailingMap = new Map<string, { total: number; months: number; categoryType: string }>()
      for (const r of trailingSpendingRes.data || []) {
        const name = (r as any).categories?.name || 'Unknown'
        const existing = trailingMap.get(name) || { total: 0, months: 0, categoryType: (r as any).categories?.category_type }
        existing.total += Number((r as any).total_amount) || 0
        existing.months += 1
        trailingMap.set(name, existing)
      }
      const trailingAvg = Array.from(trailingMap.entries()).map(([category, data]) => ({
        category,
        categoryType: data.categoryType,
        avgSpent: Math.round(data.total / Math.max(data.months, 1)),
      }))

      // Budget notes
      const budgetNotes = (budgetNotesRes.data || []).map((n: any) => ({
        note: n.note,
        estimatedAmount: n.estimated_amount ? Number(n.estimated_amount) : null,
        category: n.categories?.name || null,
      }))

      // Current 50/30/20 split (only count leaf categories, not parents)
      const leafBudgets = currentBudgets.filter((b: any) => !b.isParent)
      const needsTotal = leafBudgets
        .filter((b: any) => b.categoryType === 'need')
        .reduce((s: number, b: any) => s + b.limit, 0)
      const wantsTotal = leafBudgets
        .filter((b: any) => b.categoryType === 'want')
        .reduce((s: number, b: any) => s + b.limit, 0)
      const income = incomeResult.expectedIncome
      const savingsTotal = Math.max(0, income - needsTotal - wantsTotal)

      return {
        targetMonth,
        expectedIncome: Math.round(income),
        incomeIsProjected: incomeResult.isProjected,
        incomeProjectionBasis: incomeResult.projectionBasis,
        currentBudgets,
        lastMonthSpending,
        priorYearSpending,
        trailingAvg,
        budgetNotes,
        currentSplit: {
          needsTotal: Math.round(needsTotal),
          wantsTotal: Math.round(wantsTotal),
          savingsTotal: Math.round(savingsTotal),
          needsPct: income > 0 ? Math.round((needsTotal / income) * 100) : 0,
          wantsPct: income > 0 ? Math.round((wantsTotal / income) * 100) : 0,
          savingsPct: income > 0 ? Math.round((savingsTotal / income) * 100) : 0,
        },
      }
    },
  })
}
