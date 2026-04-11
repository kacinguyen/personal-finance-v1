import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  adjustmentId: z.string().uuid().describe('The pending adjustment ID to resolve'),
  resolvedTransactionId: z.string().uuid().optional()
    .describe('The refund transaction ID that satisfies this return (optional)'),
})

export function resolveExpectedReturnTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Resolve a pending expected return when the refund has posted. Optionally link the refund transaction.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ adjustmentId, resolvedTransactionId }: z.infer<typeof inputSchema>) => {
      // Verify ownership and fetch adjustment
      const { data: adj, error: fetchError } = await supabase
        .from('pending_adjustments')
        .select('id, transaction_id, expected_amount, description, status')
        .eq('id', adjustmentId)
        .eq('user_id', userId)
        .single()

      if (fetchError || !adj) {
        return { error: 'Pending adjustment not found or access denied' }
      }

      if (adj.status !== 'pending') {
        return { error: `This adjustment is already ${adj.status}. Cannot resolve.` }
      }

      // If a refund transaction is provided, verify it exists and belongs to user
      if (resolvedTransactionId) {
        const { data: refundTx, error: refundError } = await supabase
          .from('transactions')
          .select('id, merchant, amount')
          .eq('id', resolvedTransactionId)
          .eq('user_id', userId)
          .single()

        if (refundError || !refundTx) {
          return { error: 'Refund transaction not found or access denied' }
        }
      }

      const { error: updateError } = await supabase
        .from('pending_adjustments')
        .update({
          status: 'resolved',
          resolved_transaction_id: resolvedTransactionId || null,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', adjustmentId)
        .eq('user_id', userId)

      if (updateError) {
        return { error: `Failed to resolve: ${updateError.message}` }
      }

      return {
        success: true,
        expectedAmount: adj.expected_amount,
        description: adj.description,
        resolvedWithTransaction: !!resolvedTransactionId,
      }
    },
  })
}
