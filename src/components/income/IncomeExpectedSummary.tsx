import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Loader2,
} from 'lucide-react'
import { formatMonth } from '../../lib/dateUtils'
import type { Transaction } from '../../types/transaction'

type Props = {
  selectedMonth: Date
  totalExpectedIncome: number
  expectedSalaryIncome: number
  salaryTransactionIncome: number
  incomeChange: number
  incomeChangePercentage: number
  isProjected: boolean
  projectionBasis: 'actual' | 'one-check' | 'previous-month'
  incomeTransactionCount: number
  salaryTransactions: Transaction[]
  loadingIncomeTransactions: boolean
}

export function IncomeExpectedSummary({
  selectedMonth,
  totalExpectedIncome,
  expectedSalaryIncome,
  salaryTransactionIncome,
  incomeChange,
  incomeChangePercentage,
  isProjected,
  projectionBasis,
  incomeTransactionCount,
  salaryTransactions,
  loadingIncomeTransactions,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="bg-white rounded-2xl p-6 shadow-sm"
      style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-sm font-medium text-[#1F1410]/50 mb-2">Expected Income for {formatMonth(selectedMonth)}</p>
          <div className="flex items-baseline gap-3">
            <motion.p
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }}
              className="text-4xl font-bold text-[#10B981]"
            >
              ${totalExpectedIncome.toLocaleString()}
            </motion.p>
            <div className="flex items-center gap-1">
              {incomeChange >= 0 ? (
                <TrendingUp className="w-4 h-4 text-[#10B981]" />
              ) : (
                <TrendingDown className="w-4 h-4 text-[#FF6B6B]" />
              )}
              <span
                className="text-sm font-semibold"
                style={{ color: incomeChange >= 0 ? '#10B981' : '#FF6B6B' }}
              >
                {incomeChange >= 0 ? '+' : ''}
                {Math.abs(incomeChangePercentage).toFixed(1)}%
              </span>
            </div>
          </div>
          <p className="text-xs text-[#1F1410]/40 mt-2">
            {isProjected
              ? projectionBasis === 'one-check'
                ? `Projected from 1 paycheck (${incomeTransactionCount} income transaction${incomeTransactionCount !== 1 ? 's' : ''})`
                : `Based on last month's salary (${incomeTransactionCount} income transaction${incomeTransactionCount !== 1 ? 's' : ''})`
              : `Based on ${incomeTransactionCount} income transaction${incomeTransactionCount !== 1 ? 's' : ''} for ${formatMonth(selectedMonth)}`
            }
          </p>
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
          className="w-14 h-14 rounded-xl bg-[#10B981]/10 flex items-center justify-center"
        >
          <DollarSign className="w-7 h-7 text-[#10B981]" />
        </motion.div>
      </div>

      {/* Salary Income Breakdown */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-[#1F1410]/70">Salary Income</p>
            {isProjected && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
                {projectionBasis === 'one-check' ? 'Projected' : 'Est.'}
              </span>
            )}
          </div>
          {expectedSalaryIncome > 0 && (
            <div className="flex items-center gap-2">
              {isProjected && salaryTransactionIncome > 0 && (
                <span className="text-xs text-[#1F1410]/40">
                  ${salaryTransactionIncome.toLocaleString()} received
                </span>
              )}
              <span className="text-sm font-bold text-[#10B981]">
                ${expectedSalaryIncome.toLocaleString()}
              </span>
            </div>
          )}
        </div>
        {loadingIncomeTransactions ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-[#10B981] animate-spin" />
          </div>
        ) : salaryTransactions.length === 0 ? (
          <p className="text-sm text-[#1F1410]/40 py-4 text-center">
            No salary transactions for this month
          </p>
        ) : (
          salaryTransactions.map((tx, index) => {
            const percentage = totalExpectedIncome > 0 ? (Math.abs(tx.amount) / totalExpectedIncome) * 100 : 0
            const txDate = new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
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
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: '#10B981' }}
                    />
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </motion.div>
  )
}
