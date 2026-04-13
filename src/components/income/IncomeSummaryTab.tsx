import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  Loader2,
} from 'lucide-react'
import { formatMonth } from '../../lib/dateUtils'
import type { Transaction } from '../../types/transaction'
import type { PaystubRecord } from '../views/IncomeView'
import type { OtherIncomeCategory } from './OtherIncomeSection'

type Props = {
  selectedMonth: Date
  totalExpectedIncome: number
  expectedSalaryIncome: number
  otherIncomeTotal: number
  otherIncomeCategories: OtherIncomeCategory[]
  incomeChange: number
  incomeChangePercentage: number
  isProjected: boolean
  projectionBasis: 'actual' | 'one-check' | 'previous-month'
  salaryTransactions: Transaction[]
  loading: boolean
  paystubs: PaystubRecord[]
}

export function IncomeSummaryTab({
  selectedMonth,
  totalExpectedIncome,
  expectedSalaryIncome,
  otherIncomeTotal,
  otherIncomeCategories,
  incomeChange,
  incomeChangePercentage,
  isProjected,
  projectionBasis,
  salaryTransactions,
  loading,
  paystubs,
}: Props) {
  // YTD income from paystubs filtered to current year
  const { ytdIncome, projectedAnnual } = useMemo(() => {
    const currentYear = selectedMonth.getFullYear()
    const ytdPaystubs = paystubs.filter(
      (p) => new Date(p.pay_date + 'T00:00:00').getFullYear() === currentYear
    )
    const ytd = ytdPaystubs.reduce((sum, p) => sum + Number(p.net_pay), 0)
    return {
      ytdIncome: ytd,
      projectedAnnual: totalExpectedIncome * 12,
    }
  }, [paystubs, selectedMonth, totalExpectedIncome])

  const ytdPercentage = projectedAnnual > 0
    ? Math.min((ytdIncome / projectedAnnual) * 100, 100)
    : 0

  const fmtCurrency = (v: number) =>
    '$' + v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      {/* Hero metric row */}
      <div className="flex flex-wrap gap-3">
        {/* Total Expected Income */}
        <div className="flex-1 min-w-[140px] p-4 rounded-xl bg-[#10B981]/5 border border-[#10B981]/10">
          <p className="text-xs font-medium text-[#1F1410]/40 mb-1">Total Expected</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-light text-[#10B981]">
              {fmtCurrency(totalExpectedIncome)}
            </span>
            {incomeChangePercentage !== 0 && (
              <span
                className="flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: incomeChange >= 0 ? '#10B98115' : '#FF6B6B15',
                  color: incomeChange >= 0 ? '#10B981' : '#FF6B6B',
                }}
              >
                {incomeChange >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {incomeChange >= 0 ? '+' : ''}
                {Math.abs(incomeChangePercentage).toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        {/* Salary */}
        <div className="flex-1 min-w-[120px] p-4 rounded-xl bg-[#1F1410]/[0.02] border border-[#1F1410]/5">
          <p className="text-xs font-medium text-[#1F1410]/40 mb-1">Salary</p>
          <span className="text-lg font-light text-[#1F1410]">
            {fmtCurrency(expectedSalaryIncome)}
          </span>
        </div>

        {/* Other Income */}
        <div className="flex-1 min-w-[120px] p-4 rounded-xl bg-[#1F1410]/[0.02] border border-[#1F1410]/5">
          <p className="text-xs font-medium text-[#1F1410]/40 mb-1">Other Income</p>
          <span className="text-lg font-light text-[#1F1410]">
            {fmtCurrency(otherIncomeTotal)}
          </span>
        </div>
      </div>

      {/* Projection note */}
      {isProjected && (
        <p className="text-xs text-[#1F1410]/40">
          {projectionBasis === 'one-check'
            ? `Projected from 1 paycheck received in ${formatMonth(selectedMonth)}`
            : `Based on last month's salary — no transactions yet for ${formatMonth(selectedMonth)}`
          }
        </p>
      )}

      {/* YTD progress */}
      {ytdIncome > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[#1F1410]/50">
              YTD Income
            </span>
            <span className="text-xs text-[#1F1410]/40">
              {fmtCurrency(ytdIncome)} / {fmtCurrency(projectedAnnual)} projected
            </span>
          </div>
          <div className="h-2 bg-[#1F1410]/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${ytdPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-[#10B981]"
            />
          </div>
        </div>
      )}

      {/* Salary transactions list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-[#1F1410]/70">Salary Transactions</p>
          {isProjected && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
              {projectionBasis === 'one-check' ? 'Projected' : 'Est.'}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-[#10B981] animate-spin" />
          </div>
        ) : salaryTransactions.length === 0 ? (
          <p className="text-sm text-[#1F1410]/40 py-4 text-center">
            No salary transactions for this month
          </p>
        ) : (
          <div className="space-y-3">
            {salaryTransactions.map((tx, index) => {
              const percentage =
                totalExpectedIncome > 0
                  ? (Math.abs(tx.amount) / totalExpectedIncome) * 100
                  : 0
              const txDate = new Date(tx.date + 'T00:00:00').toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric' }
              )
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#10B98115' }}
                  >
                    <Briefcase className="w-5 h-5" style={{ color: '#10B981' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#1F1410]">
                        {tx.merchant || 'Salary'} ({txDate})
                      </span>
                      <span className="text-sm font-bold text-[#1F1410]">
                        ${Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1.5 bg-[#1F1410]/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.1 + index * 0.05, duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: '#10B981' }}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Other income chips */}
      {otherIncomeCategories.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-[#1F1410]/70 mb-3">Other Income</p>
          <div className="flex flex-wrap gap-2">
            {otherIncomeCategories.map((cat) => {
              const CatIcon = cat.icon
              return (
                <div
                  key={cat.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
                  style={{
                    backgroundColor: cat.color + '15',
                    border: `1px solid ${cat.color}25`,
                  }}
                >
                  <CatIcon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                  <span className="font-medium text-[#1F1410]/70">{cat.name}</span>
                  <span className="font-bold" style={{ color: cat.color }}>
                    ${cat.amount.toLocaleString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
