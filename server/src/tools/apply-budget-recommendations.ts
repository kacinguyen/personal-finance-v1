import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  targetMonth: z
    .string()
    .describe('The month these budget changes apply to (YYYY-MM-DD, first of month)'),
  changes: z
    .array(
      z.object({
        budgetId: z.string().uuid().describe('The budget ID to update'),
        newLimit: z.number().min(0).describe('New monthly_limit in dollars'),
      }),
    )
    .min(1)
    .describe('List of budget changes to apply'),
})

export function applyBudgetRecommendationsTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description:
      'Apply recommended budget changes. Updates monthly_limit on each budget and creates a monthly snapshot. Only call this AFTER the user has confirmed the recommendations.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ targetMonth, changes }: z.infer<typeof inputSchema>) => {
      // Verify all budgets belong to this user
      const budgetIds = changes.map(c => c.budgetId)
      const { data: budgets, error: fetchError } = await supabase
        .from('budgets')
        .select('id, category_id, monthly_limit, categories(name)')
        .eq('user_id', userId)
        .in('id', budgetIds)

      if (fetchError) {
        return { error: `Failed to verify budgets: ${fetchError.message}` }
      }

      const foundIds = new Set((budgets || []).map((b: any) => b.id))
      const missing = budgetIds.filter(id => !foundIds.has(id))
      if (missing.length > 0) {
        return { error: `Budget(s) not found or access denied: ${missing.join(', ')}` }
      }

      // Build a map of old limits for the summary
      const oldLimits = new Map<string, { limit: number; name: string }>()
      for (const b of budgets || []) {
        oldLimits.set(b.id, {
          limit: Number(b.monthly_limit),
          name: (b as any).categories?.name || 'Unknown',
        })
      }

      // Apply changes: update budgets and upsert budget_months
      const errors: string[] = []
      const applied: { category: string; oldLimit: number; newLimit: number; delta: number }[] = []

      for (const change of changes) {
        const old = oldLimits.get(change.budgetId)
        if (!old) continue

        // Skip no-ops
        if (old.limit === change.newLimit) continue

        // Update the budget
        const { error: updateError } = await supabase
          .from('budgets')
          .update({ monthly_limit: change.newLimit, updated_at: new Date().toISOString() })
          .eq('id', change.budgetId)
          .eq('user_id', userId)

        if (updateError) {
          errors.push(`${old.name}: ${updateError.message}`)
          continue
        }

        // Upsert monthly snapshot
        const { error: upsertError } = await supabase
          .from('budget_months')
          .upsert(
            {
              budget_id: change.budgetId,
              user_id: userId,
              month: targetMonth,
              monthly_limit: change.newLimit,
            },
            { onConflict: 'budget_id,month' },
          )

        if (upsertError) {
          errors.push(`${old.name} snapshot: ${upsertError.message}`)
        }

        applied.push({
          category: old.name,
          oldLimit: old.limit,
          newLimit: change.newLimit,
          delta: change.newLimit - old.limit,
        })
      }

      if (errors.length > 0 && applied.length === 0) {
        return { error: `All updates failed: ${errors.join('; ')}` }
      }

      return {
        success: true,
        targetMonth,
        changesApplied: applied.length,
        changes: applied,
        ...(errors.length > 0 ? { warnings: errors } : {}),
      }
    },
  })
}
