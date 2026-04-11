import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  transactionId: z.string().uuid().describe('The transaction ID to recategorize'),
  categoryName: z.string().describe('The target category name (must match an existing category)'),
})

export function recategorizeTransactionTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Change the category of a transaction. Look up the transaction first with query_transactions to get its ID.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ transactionId, categoryName }: z.infer<typeof inputSchema>) => {
      // Verify ownership and fetch current category
      const { data: tx, error: fetchError } = await supabase
        .from('transactions')
        .select('id, merchant, amount, date, category_id, categories(name)')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !tx) {
        return { error: 'Transaction not found or access denied' }
      }

      // Look up target category by exact name first, then partial match
      let { data: matches } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_active', true)
        .ilike('name', categoryName)

      if (!matches || matches.length === 0) {
        const { data: partialMatches } = await supabase
          .from('categories')
          .select('id, name')
          .eq('user_id', userId)
          .eq('is_active', true)
          .ilike('name', `%${categoryName}%`)

        matches = partialMatches || []
      }

      if (matches.length === 0) {
        return { error: `No category found matching "${categoryName}". Ask the user to clarify.` }
      }

      if (matches.length > 1) {
        return {
          error: 'Multiple categories match',
          matches: matches.map(c => c.name),
          message: 'Ask the user which category they meant.',
        }
      }

      const targetCategory = matches[0]

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category_id: targetCategory.id })
        .eq('id', transactionId)
        .eq('user_id', userId)

      if (updateError) {
        return { error: `Failed to recategorize: ${updateError.message}` }
      }

      return {
        success: true,
        transaction: {
          merchant: tx.merchant,
          amount: tx.amount,
          date: tx.date,
        },
        previousCategory: (tx as any).categories?.name || 'Uncategorized',
        newCategory: targetCategory.name,
      }
    },
  })
}
