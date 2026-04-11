import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  transactionId: z.string().uuid().describe('The transaction ID for the purchase'),
  expectedReturnAmount: z.number().positive().describe('Dollar amount expected back from the return'),
  description: z.string().describe('What is being returned, e.g. "2 of 3 dresses"'),
  returnWindowDays: z.number().int().min(1).max(365).optional()
    .describe('Days until return window closes (default: 30)'),
})

export function createExpectedReturnTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Mark a transaction as having an expected return or refund. This does NOT change the transaction amount — it creates an advisory record so budget advice can factor in the anticipated refund.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ transactionId, expectedReturnAmount, description, returnWindowDays }: z.infer<typeof inputSchema>) => {
      // Verify ownership and fetch transaction
      const { data: tx, error: fetchError } = await supabase
        .from('transactions')
        .select('id, merchant, amount, date')
        .eq('id', transactionId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !tx) {
        return { error: 'Transaction not found or access denied' }
      }

      // Must be an expense
      if (tx.amount >= 0) {
        return { error: 'Can only create expected returns for expense transactions.' }
      }

      // Validate return amount doesn't exceed transaction
      if (expectedReturnAmount > Math.abs(tx.amount)) {
        return {
          error: `Expected return amount ($${expectedReturnAmount}) exceeds the transaction amount ($${Math.abs(tx.amount)}). The return can't be more than what was spent.`,
        }
      }

      // Check for existing pending adjustment
      const { data: existing } = await supabase
        .from('pending_adjustments')
        .select('id, expected_amount, description, status')
        .eq('transaction_id', transactionId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single()

      if (existing) {
        return {
          error: 'This transaction already has a pending expected return',
          existing: {
            expectedAmount: existing.expected_amount,
            description: existing.description,
          },
          message: 'Ask the user if they want to update the existing return.',
        }
      }

      const days = returnWindowDays ?? 30
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days)

      const { error: insertError } = await supabase
        .from('pending_adjustments')
        .insert({
          user_id: userId,
          transaction_id: transactionId,
          adjustment_type: 'expected_return',
          expected_amount: expectedReturnAmount,
          description,
          status: 'pending',
          expires_at: expiresAt.toISOString().split('T')[0],
        })

      if (insertError) {
        return { error: `Failed to create expected return: ${insertError.message}` }
      }

      return {
        success: true,
        transaction: {
          merchant: tx.merchant,
          amount: tx.amount,
          date: tx.date,
        },
        expectedReturnAmount,
        description,
        expiresAt: expiresAt.toISOString().split('T')[0],
        note: 'The transaction amount stays unchanged until the refund posts. This is tracked as an expected return for budget advice.',
      }
    },
  })
}
