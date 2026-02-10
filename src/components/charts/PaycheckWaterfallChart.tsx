import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

type PaystubRecord = {
  id: string
  gross_pay: number
  net_pay: number
  // Pre-tax deductions
  health_insurance: number | null
  dental_insurance: number | null
  vision_insurance: number | null
  life_insurance: number | null
  ad_and_d_insurance: number | null
  fsa_contribution: number | null
  traditional_401k: number | null
  roth_401k: number | null
  after_tax_401k: number | null
  hsa_contribution: number | null
  espp_contribution: number | null
  other_pretax: number | null
  // Taxes
  federal_income_tax: number | null
  state_income_tax: number | null
  social_security_tax: number | null
  medicare_tax: number | null
  local_tax: number | null
  state_disability_insurance: number | null
  other_taxes: number | null
  // Post-tax
  other_posttax: number | null
}

type Props = {
  paystubs: PaystubRecord[]
}

type WaterfallItem = {
  name: string
  value: number
  spacer: number
  color: string
}

const COLORS = {
  gross: '#10B981',
  preTax: '#F59E0B',
  taxes: '#FF6B6B',
  postTax: '#A855F7',
  net: '#10B981',
}

function sumNullable(...values: (number | null)[]): number {
  return values.reduce<number>((sum, v) => sum + (Number(v) || 0), 0)
}

export function PaycheckWaterfallChart({ paystubs }: Props) {
  const chartData = useMemo(() => {
    if (paystubs.length === 0) return []

    // Aggregate across all paystubs in the period
    let totalGross = 0
    let totalPreTax = 0
    let totalTaxes = 0
    let totalPostTax = 0
    let totalNet = 0

    paystubs.forEach(p => {
      totalGross += Number(p.gross_pay) || 0
      totalNet += Number(p.net_pay) || 0

      totalPreTax += sumNullable(
        p.health_insurance,
        p.dental_insurance,
        p.vision_insurance,
        p.life_insurance,
        p.ad_and_d_insurance,
        p.fsa_contribution,
        p.traditional_401k,
        p.roth_401k,
        p.after_tax_401k,
        p.hsa_contribution,
        p.espp_contribution,
        p.other_pretax,
      )

      totalTaxes += sumNullable(
        p.federal_income_tax,
        p.state_income_tax,
        p.social_security_tax,
        p.medicare_tax,
        p.local_tax,
        p.state_disability_insurance,
        p.other_taxes,
      )

      totalPostTax += sumNullable(p.other_posttax)
    })

    // If we don't have deduction data, derive from gross - net
    const hasDeductions = totalPreTax > 0 || totalTaxes > 0 || totalPostTax > 0
    if (!hasDeductions && totalGross > 0 && totalNet > 0) {
      // Can't break down further without data — show just gross and net
      return [
        { name: 'Gross Pay', value: totalGross, spacer: 0, color: COLORS.gross },
        { name: 'Net Pay', value: totalNet, spacer: 0, color: COLORS.net },
      ] as WaterfallItem[]
    }

    if (totalGross === 0) return []

    const items: WaterfallItem[] = [
      { name: 'Gross Pay', value: totalGross, spacer: 0, color: COLORS.gross },
    ]

    let runningTotal = totalGross

    if (totalPreTax > 0) {
      runningTotal -= totalPreTax
      items.push({ name: 'Pre-Tax', value: totalPreTax, spacer: runningTotal, color: COLORS.preTax })
    }

    if (totalTaxes > 0) {
      runningTotal -= totalTaxes
      items.push({ name: 'Taxes', value: totalTaxes, spacer: runningTotal, color: COLORS.taxes })
    }

    if (totalPostTax > 0) {
      runningTotal -= totalPostTax
      items.push({ name: 'Post-Tax', value: totalPostTax, spacer: runningTotal, color: COLORS.postTax })
    }

    items.push({ name: 'Net Pay', value: totalNet, spacer: 0, color: COLORS.net })

    return items
  }, [paystubs])

  if (chartData.length === 0) {
    return null
  }

  const grossPay = chartData[0]?.value || 1

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
      className="bg-white rounded-2xl p-6 shadow-sm"
      style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
    >
      <h3 className="text-sm font-semibold text-[#1F1410]/70 mb-4">Paycheck Breakdown</h3>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="20%">
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(31, 20, 16, 0.5)', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(31, 20, 16, 0.4)', fontSize: 11 }}
            tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
          />
          <Tooltip content={<WaterfallTooltip grossPay={grossPay} />} />
          <Bar dataKey="spacer" stackId="waterfall" fill="transparent" radius={0} isAnimationActive={false} />
          <Bar dataKey="value" stackId="waterfall" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

function WaterfallTooltip({ active, payload, grossPay }: { active?: boolean; payload?: Array<{ payload: WaterfallItem }>; grossPay: number }) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload

  return (
    <div className="bg-white rounded-xl p-3 shadow-lg border border-[#1F1410]/5">
      <p className="text-sm font-semibold text-[#1F1410] mb-1">{data.name}</p>
      <p className="text-sm text-[#1F1410]/70">
        ${data.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      <p className="text-xs text-[#1F1410]/40 mt-0.5">
        {((data.value / grossPay) * 100).toFixed(1)}% of gross
      </p>
    </div>
  )
}
