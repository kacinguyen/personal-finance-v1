import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  transactionId: z.string().uuid().describe('The transaction ID to split'),
  userSharePercentage: z.number().min(1).max(99).describe('The percentage the user is responsible for (e.g. 50 for a 50/50 split)'),
  notes: z.string().optional().describe('Who the split is with, e.g. "Dinner with Alex"'),
})

export function splitWithOthersTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Record a shared expense where the user paid the full amount but others owe them back. This adjusts the transaction amount to the user\'s share and creates a pending reimbursement for the remainder.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ transactionId, userSharePercentage, notes }: z.infer<typeof inputSchema>) => {
      // Verify ownership and fetch transaction
      const { data: tx, error: fetchError } = await supabase
        .from('transactions')
        .select('id, merchant, amount, date, amount_modified_by_split')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !tx) {
        return { error: 'Transaction not found or access denied' }
      }

      // Must be an expense (negative amount)
      if (tx.amount >= 0) {
        return { error: 'Can only split expense transactions (negative amounts). This transaction is income or zero.' }
      }

      // Check for existing reimbursement
      const { data: existing } = await supabase
        .from('pending_reimbursements')
        .select('id, user_share, others_share, status')
        .eq('transaction_id', transactionId)
        .eq('user_id', userId)
        .single()

      if (existing) {
        return {
          error: 'This transaction already has a shared split',
          existingSplit: {
            userShare: existing.user_share,
            othersShare: existing.others_share,
            status: existing.status,
          },
          message: 'The transaction is already split. Ask the user if they want to update it.',
        }
      }

      const originalAmount = tx.amount // negative for expenses
      const fraction = userSharePercentage / 100
      const userShare = Math.round(originalAmount * fraction * 100) / 100 // negative
      const othersShare = Math.round(Math.abs(originalAmount - userShare) * 100) / 100 // positive

      // Update transaction amount to user's share
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          amount: userShare,
          amount_modified_by_split: true,
        })
        .eq('id', transactionId)
        .eq('user_id', userId)

      if (updateError) {
        return { error: `Failed to update transaction: ${updateError.message}` }
      }

      // Create pending reimbursement
      const { error: insertError } = await supabase
        .from('pending_reimbursements')
        .insert({
          user_id: userId,
          transaction_id: transactionId,
          original_amount: originalAmount,
          user_share: userShare,
          others_share: othersShare,
          split_percentage: userSharePercentage,
          status: 'pending',
          notes: notes || null,
        })

      if (insertError) {
        return { error: `Failed to create reimbursement record: ${insertError.message}` }
      }

      return {
        success: true,
        transaction: {
          merchant: tx.merchant,
          date: tx.date,
        },
        originalAmount,
        userShare,
        othersOwe: othersShare,
        splitPercentage: userSharePercentage,
      }
    },
  })
}
