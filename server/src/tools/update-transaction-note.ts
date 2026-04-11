import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  transactionId: z.string().uuid().describe('The transaction ID to update'),
  notes: z.string().max(500).describe('Note text to set on the transaction'),
})

export function updateTransactionNoteTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Add or update a note on a transaction. Use this when the user wants to add context to a transaction.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ transactionId, notes }: z.infer<typeof inputSchema>) => {
      // Verify ownership and fetch transaction details
      const { data: tx, error: fetchError } = await supabase
        .from('transactions')
        .select('id, merchant, amount, date, notes')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !tx) {
        return { error: 'Transaction not found or access denied' }
      }

      const { error: updateError } = await supabase
        .from('transactions')
        .update({ notes })
        .eq('id', transactionId)
        .eq('user_id', userId)

      if (updateError) {
        return { error: `Failed to update note: ${updateError.message}` }
      }

      return {
        success: true,
        transaction: {
          merchant: tx.merchant,
          amount: tx.amount,
          date: tx.date,
        },
        previousNotes: tx.notes,
        newNotes: notes,
      }
    },
  })
}
