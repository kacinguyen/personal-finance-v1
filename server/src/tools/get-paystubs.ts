import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'

const inputSchema = z.object({
  limit: z.number().default(6).describe('Number of recent paystubs to return'),
})

export function getPaystubsTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description: 'Get recent paystubs with detailed breakdown of earnings, deductions, taxes, and contributions.',
    inputSchema: zodSchema(inputSchema),
    execute: async ({ limit }: z.infer<typeof inputSchema>) => {
      const { data, error } = await supabase
        .from('paystubs')
        .select('*')
        .eq('user_id', userId)
        .order('pay_date', { ascending: false })
        .limit(limit)

      if (error) return { error: error.message }

      return (data || []).map((p: any) => ({
        payDate: p.pay_date,
        grossPay: p.gross_pay,
        netPay: p.net_pay,
        regularPay: p.regular_pay,
        bonusPay: p.bonus_pay,
        traditional401k: p.traditional_401k,
        roth401k: p.roth_401k,
        employer401kMatch: p.employer_401k_match,
        hsaContribution: p.hsa_contribution,
        esppContribution: p.espp_contribution,
        healthInsurance: p.health_insurance,
        federalTax: p.federal_income_tax,
        stateTax: p.state_income_tax,
        socialSecurity: p.social_security_tax,
        medicare: p.medicare_tax,
      }))
    },
  })
}
