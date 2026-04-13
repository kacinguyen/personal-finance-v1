import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  targetMonth: z
    .string()
    .describe('The month this note applies to (YYYY-MM-DD, first of month)'),
  note: z
    .string()
    .describe('Description of the upcoming expense, e.g. "Wedding gift for Sarah"'),
  estimatedAmount: z
    .number()
    .positive()
    .optional()
    .describe('Estimated dollar amount if known'),
  categoryName: z
    .string()
    .optional()
    .describe('Budget category name this expense falls under, e.g. "Gifts" or "Car"'),
})

export function addBudgetNoteTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description:
      'Save a note about an upcoming expense the user expects in a future month. This context is used when suggesting budget adjustments. Always confirm with the user before calling this.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ targetMonth, note, estimatedAmount, categoryName }: z.infer<typeof inputSchema>) => {
      // Resolve category name to ID if provided
      let categoryId: string | null = null
      if (categoryName) {
        const { data: cat } = await supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', userId)
          .ilike('name', categoryName)
          .eq('is_active', true)
          .limit(1)
          .single()

        if (cat) {
          categoryId = cat.id
        }
      }

      const { error } = await supabase
        .from('budget_notes')
        .insert({
          user_id: userId,
          target_month: targetMonth,
          note,
          estimated_amount: estimatedAmount ?? null,
          category_id: categoryId,
        })

      if (error) {
        return { error: `Failed to save budget note: ${error.message}` }
      }

      return {
        success: true,
        targetMonth,
        note,
        estimatedAmount: estimatedAmount ?? null,
        category: categoryName ?? null,
        message: `Noted for ${targetMonth}: "${note}"${estimatedAmount ? ` (~$${estimatedAmount})` : ''}. This will be factored into budget suggestions for that month.`,
      }
    },
  })
}
