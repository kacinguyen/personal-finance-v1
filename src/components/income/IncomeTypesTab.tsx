import { useMemo } from 'react'
import { PiggyBank, Building2, Heart, Briefcase } from 'lucide-react'
import { formatMonth } from '../../lib/dateUtils'
import type { PaystubRecord } from '../views/IncomeView'

type ContributionTotals = {
  traditional_401k: number
  roth_401k: number
  after_tax_401k: number
  employer_401k_match: number
  hsa: number
  espp: number
  total401k: number
  total401kWithMatch: number
}

type Props = {
  selectedMonth: Date
  contributions: ContributionTotals
  ytdContributions: ContributionTotals
  displayPaystubs: PaystubRecord[]
  paystubs: PaystubRecord[]
  expectedSalaryIncome: number
  otherIncomeTotal: number
}

type LineRow = {
  label: string
  monthly: number
  ytd: number
  highlight?: boolean
  bold?: boolean
  dividerAbove?: boolean
}

const fmtCurrency = (v: number) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function SectionTable({
  rows,
  monthLabel,
  accentColor,
}: {
  rows: LineRow[]
  monthLabel: string
  accentColor?: string
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-xs text-[#1F1410]/40">
          <th className="text-left pb-2 font-medium">Line Item</th>
          <th className="text-right pb-2 font-medium">{monthLabel}</th>
          <th className="text-right pb-2 font-medium">YTD</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className={row.dividerAbove ? 'border-t border-[#1F1410]/5' : ''}
          >
            <td
              className={`py-2 ${
                row.highlight
                  ? 'text-[#10B981]'
                  : row.bold
                    ? 'font-semibold text-[#1F1410]'
                    : 'text-[#1F1410]/70'
              }`}
            >
              {row.label}
            </td>
            <td
              className={`py-2 text-right ${
                row.highlight
                  ? 'text-[#10B981] font-semibold'
                  : row.bold
                    ? `font-bold${accentColor ? '' : ' text-[#1F1410]'}`
                    : 'font-medium text-[#1F1410]'
              }`}
              style={row.bold && accentColor ? { color: accentColor } : undefined}
            >
              {fmtCurrency(row.monthly)}
            </td>
            <td
              className={`py-2 text-right ${
                row.bold
                  ? 'font-semibold text-[#1F1410]/70'
                  : 'text-[#1F1410]/50'
              }`}
            >
              {fmtCurrency(row.ytd)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function IncomeTypesTab({
  selectedMonth,
  contributions,
  ytdContributions,
  displayPaystubs,
  paystubs,
  expectedSalaryIncome,
  otherIncomeTotal,
}: Props) {
  // Salary from paystubs
  const { monthlyGross, monthlyNet, monthlyBonus, ytdGross, ytdNet, ytdBonus } = useMemo(() => {
    const currentYear = selectedMonth.getFullYear()
    const ytdPaystubs = paystubs.filter(p => new Date(p.pay_date).getFullYear() === currentYear)

    return {
      monthlyGross: displayPaystubs.reduce((s, p) => s + (Number(p.gross_pay) || 0), 0),
      monthlyNet: displayPaystubs.reduce((s, p) => s + (Number(p.net_pay) || 0), 0),
      monthlyBonus: displayPaystubs.reduce((s, p) => s + (Number(p.bonus_pay) || 0), 0),
      ytdGross: ytdPaystubs.reduce((s, p) => s + (Number(p.gross_pay) || 0), 0),
      ytdNet: ytdPaystubs.reduce((s, p) => s + (Number(p.net_pay) || 0), 0),
      ytdBonus: ytdPaystubs.reduce((s, p) => s + (Number(p.bonus_pay) || 0), 0),
    }
  }, [displayPaystubs, paystubs, selectedMonth])

  const has401kData =
    contributions.total401kWithMatch > 0 || ytdContributions.total401kWithMatch > 0
  const hasEspp =
    contributions.espp > 0 || ytdContributions.espp > 0
  const hasHsa =
    contributions.hsa > 0 || ytdContributions.hsa > 0
  const hasSalaryData = monthlyGross > 0 || ytdGross > 0 || expectedSalaryIncome > 0

  if (!has401kData && !hasEspp && !hasHsa && !hasSalaryData) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[#1F1410]/40">No contribution data for this period</p>
      </div>
    )
  }

  const monthLabel = formatMonth(selectedMonth)

  // Salary rows
  const salaryRows: LineRow[] = []
  if (monthlyGross > 0 || ytdGross > 0) {
    salaryRows.push({ label: 'Gross Pay', monthly: monthlyGross, ytd: ytdGross })
  }
  if (monthlyBonus > 0 || ytdBonus > 0) {
    salaryRows.push({ label: 'Bonus', monthly: monthlyBonus, ytd: ytdBonus })
  }
  if (monthlyNet > 0 || ytdNet > 0) {
    salaryRows.push({
      label: 'Net Pay',
      monthly: monthlyNet,
      ytd: ytdNet,
      bold: true,
      dividerAbove: salaryRows.length > 0,
    })
  }
  // If no paystub data but we have transaction-based salary
  if (salaryRows.length === 0 && expectedSalaryIncome > 0) {
    salaryRows.push({ label: 'Salary (transactions)', monthly: expectedSalaryIncome, ytd: 0 })
  }
  if (otherIncomeTotal > 0) {
    salaryRows.push({ label: 'Other Income', monthly: otherIncomeTotal, ytd: 0, highlight: true })
  }

  // 401k rows
  const fourOhOneKRows: LineRow[] = []
  if (contributions.traditional_401k > 0 || ytdContributions.traditional_401k > 0) {
    fourOhOneKRows.push({
      label: 'Traditional',
      monthly: contributions.traditional_401k,
      ytd: ytdContributions.traditional_401k,
    })
  }
  if (contributions.roth_401k > 0 || ytdContributions.roth_401k > 0) {
    fourOhOneKRows.push({
      label: 'Roth',
      monthly: contributions.roth_401k,
      ytd: ytdContributions.roth_401k,
    })
  }
  if (contributions.after_tax_401k > 0 || ytdContributions.after_tax_401k > 0) {
    fourOhOneKRows.push({
      label: 'After-Tax',
      monthly: contributions.after_tax_401k,
      ytd: ytdContributions.after_tax_401k,
    })
  }
  if (fourOhOneKRows.length > 1) {
    fourOhOneKRows.push({
      label: 'Employee Total',
      monthly: contributions.total401k,
      ytd: ytdContributions.total401k,
      bold: true,
      dividerAbove: true,
    })
  }
  if (contributions.employer_401k_match > 0 || ytdContributions.employer_401k_match > 0) {
    fourOhOneKRows.push({
      label: '+ Employer Match',
      monthly: contributions.employer_401k_match,
      ytd: ytdContributions.employer_401k_match,
      highlight: true,
      dividerAbove: fourOhOneKRows.length <= 1,
    })
  }
  if (fourOhOneKRows.length > 0) {
    fourOhOneKRows.push({
      label: 'Total with Match',
      monthly: contributions.total401kWithMatch,
      ytd: ytdContributions.total401kWithMatch,
      bold: true,
      dividerAbove: true,
    })
  }

  return (
    <div className="space-y-6">
      {/* Salary Section */}
      {salaryRows.length > 0 && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-[#10B981]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F1410]">Salary</h3>
          </div>
          <SectionTable rows={salaryRows} monthLabel={monthLabel} accentColor="#10B981" />
        </div>
      )}

      {/* 401(k) Section */}
      {has401kData && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
              <PiggyBank className="w-4 h-4 text-[#6366F1]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F1410]">401(k) Contributions</h3>
          </div>
          <SectionTable rows={fourOhOneKRows} monthLabel={monthLabel} accentColor="#6366F1" />
        </div>
      )}

      {/* ESPP Section */}
      {hasEspp && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#14B8A6]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F1410]">ESPP</h3>
          </div>
          <SectionTable
            rows={[{
              label: 'ESPP Contribution',
              monthly: contributions.espp,
              ytd: ytdContributions.espp,
            }]}
            monthLabel={monthLabel}
            accentColor="#14B8A6"
          />
        </div>
      )}

      {/* HSA Section */}
      {hasHsa && (
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-lg bg-[#EC4899]/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-[#EC4899]" />
            </div>
            <h3 className="text-sm font-bold text-[#1F1410]">HSA</h3>
          </div>
          <SectionTable
            rows={[{
              label: 'HSA Contribution',
              monthly: contributions.hsa,
              ytd: ytdContributions.hsa,
            }]}
            monthLabel={monthLabel}
            accentColor="#EC4899"
          />
        </div>
      )}
    </div>
  )
}
