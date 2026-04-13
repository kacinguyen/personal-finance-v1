import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const changeSchema = z.object({
  budgetId: z.string().uuid(),
  category: z.string(),
  currentLimit: z.number(),
  newLimit: z.number(),
  reason: z.string(),
})

const inputSchema = z.object({
  targetMonth: z.string().describe('The month these changes apply to (YYYY-MM-DD, first of month)'),
  changes: z.array(changeSchema).min(1).describe('List of proposed budget changes'),
})

export type ProposedBudgetChange = z.infer<typeof changeSchema>

export function proposeBudgetChangesTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description:
      'Present budget change recommendations to the user as an interactive card. Call this INSTEAD of asking "Should I apply these changes?" — the user will see checkboxes to select which changes to apply. Only include leaf categories (not parent categories).',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ targetMonth, changes }: z.infer<typeof inputSchema>) => {
      // This is a pass-through tool — it returns the structured data so the
      // frontend can render an interactive approval card.
      return {
        type: 'budget_proposal',
        targetMonth,
        changes: changes.map(c => ({
          ...c,
          delta: c.newLimit - c.currentLimit,
        })),
      }
    },
  })
}
