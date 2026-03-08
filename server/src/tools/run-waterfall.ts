import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildFinancialSnapshot } from '../context/financial-snapshot.js'
import { runWaterfall } from '../engine/waterfall.js'

const inputSchema = z.object({})

export function runWaterfallTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Run the savings waterfall analysis to determine financial priorities: Emergency Fund → 401k Match → High-Interest Debt → ESPP → RSU Diversification.',
    inputSchema: zodSchema(inputSchema),
    execute: async () => {
      const snapshot = await buildFinancialSnapshot(supabase, userId)
      return runWaterfall(snapshot)
    },
  })
}
