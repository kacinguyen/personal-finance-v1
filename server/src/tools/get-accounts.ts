import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({})

export function getAccountsTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Get all active accounts with their current balances, grouped by type.',
    inputSchema: zodSchema(inputSchema),
    execute: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('account_type')

      if (error) return { error: error.message }

      return (data || []).map((a: any) => ({
        name: a.name,
        type: a.account_type,
        balance: a.balance,
        institution: a.institution_name,
      }))
    },
  })
}
