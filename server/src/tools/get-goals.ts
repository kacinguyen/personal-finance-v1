import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({})

export function getGoalsTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Get all active financial goals with their progress and priorities.',
    inputSchema: zodSchema(inputSchema),
    execute: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('priority', { ascending: true })

      if (error) return { error: error.message }

      return (data || []).map((g: any) => ({
        name: g.name,
        goalType: g.goal_type,
        currentAmount: g.current_amount,
        targetAmount: g.target_amount,
        percentComplete: g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0,
        priority: g.priority,
        deadline: g.deadline,
        autoContribute: g.auto_contribute,
        contributionField: g.contribution_field,
      }))
    },
  })
}
