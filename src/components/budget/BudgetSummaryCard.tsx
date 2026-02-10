import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  Shield,
  Sparkles,
  PiggyBank,
} from 'lucide-react'

export type BudgetSummaryCardProps = {
  totalBudget: number
  expectedIncome: number
  needsBudget: number
  wantsBudget: number
  savingsBudget: number
}

export function BudgetSummaryCard({
  totalBudget,
  expectedIncome,
  needsBudget,
  wantsBudget,
  savingsBudget,
}: BudgetSummaryCardProps) {
  const remainingToAllocate = expectedIncome - totalBudget
  const isOverBudget = remainingToAllocate < 0

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        delay: 0.2,
        duration: 0.4,
      }}
      className="bg-white rounded-2xl p-6 shadow-sm mb-8"
      style={{
        boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)',
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[#1F1410]/50 mb-1">
            Total Budget
          </span>
          <span className="text-3xl font-bold text-[#1F1410]">
            ${totalBudget.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[#1F1410]/50 mb-1">
            Expected Income
          </span>
          <span className="text-3xl font-bold text-[#1F1410]">
            ${expectedIncome.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Left to Allocate with Needs/Wants breakdown */}
      <div className="border-t border-[#1F1410]/5 pt-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-[#1F1410]/50">
            {isOverBudget ? 'Over Budget' : 'Left to Allocate'}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-bold ${isOverBudget ? 'text-[#FF6B6B]' : 'text-[#10B981]'}`}
            >
              {isOverBudget ? '-' : ''}$
              {Math.abs(remainingToAllocate).toLocaleString()}
            </span>
            {isOverBudget ? (
              <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
            )}
          </div>
        </div>

        {/* Needs / Wants / Savings Breakdown */}
        <div className="grid grid-cols-3 gap-3">
          {/* Needs */}
          <div className="bg-[#10B981]/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Shield className="w-3.5 h-3.5 text-[#10B981]" />
              <span className="text-xs font-semibold text-[#10B981]">
                Needs
              </span>
            </div>
            <p className="text-xl font-bold text-[#1F1410]">
              ${needsBudget.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#1F1410]/40 mt-0.5">
              {expectedIncome > 0 ? Math.round((needsBudget / expectedIncome) * 100) : 0}% of income
            </p>
          </div>

          {/* Wants */}
          <div className="bg-[#A855F7]/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />
              <span className="text-xs font-semibold text-[#A855F7]">
                Wants
              </span>
            </div>
            <p className="text-xl font-bold text-[#1F1410]">
              ${wantsBudget.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#1F1410]/40 mt-0.5">
              {expectedIncome > 0 ? Math.round((wantsBudget / expectedIncome) * 100) : 0}% of income
            </p>
          </div>

          {/* Savings */}
          <div className="bg-[#38BDF8]/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <PiggyBank className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span className="text-xs font-semibold text-[#38BDF8]">
                Savings
              </span>
            </div>
            <p className="text-xl font-bold text-[#1F1410]">
              ${savingsBudget.toLocaleString()}
            </p>
            <p className="text-[10px] text-[#1F1410]/40 mt-0.5">
              {expectedIncome > 0 ? Math.round((savingsBudget / expectedIncome) * 100) : 0}% of income
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-3 bg-[#1F1410]/5 rounded-full overflow-hidden flex">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${expectedIncome > 0 ? Math.min((needsBudget / expectedIncome) * 100, 100) : 0}%`,
              }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-[#10B981]"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${expectedIncome > 0 ? Math.min((wantsBudget / expectedIncome) * 100, 100) : 0}%`,
              }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="h-full bg-[#A855F7]"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${expectedIncome > 0 ? Math.min((savingsBudget / expectedIncome) * 100, 100) : 0}%`,
              }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
              className="h-full bg-[#38BDF8]"
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-[#1F1410]/40">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span>Needs</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#A855F7]" />
                <span>Wants</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                <span>Savings</span>
              </div>
            </div>
            <span>
              {expectedIncome > 0 ? Math.round((totalBudget / expectedIncome) * 100) : 0}% allocated
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
