import { motion } from 'framer-motion'
import {
  AlertCircle,
  Shield,
  Sparkles,
  PiggyBank,
} from 'lucide-react'

export type BudgetSummaryCardProps = {
  expectedIncome: number
  needsBudget: number
  wantsBudget: number
  savingsBudget: number
}

export function BudgetSummaryCard({
  expectedIncome,
  needsBudget,
  wantsBudget,
  savingsBudget,
}: BudgetSummaryCardProps) {
  const isOverBudget = needsBudget + wantsBudget > expectedIncome
  const pct = (v: number) => expectedIncome > 0 ? Math.round((v / expectedIncome) * 100) : 0

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
      className="bg-white rounded-2xl p-6 mb-8 border border-[#1F1410]/5"
    >
      {isOverBudget && (
        <div className="flex items-center gap-2 mb-4 text-[#FF6B6B]">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">
            Needs + Wants exceed expected income
          </span>
        </div>
      )}

      {/* Income + Needs/Wants/Savings on one line */}
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3">
        {/* Expected Income */}
        <div className="flex flex-col justify-center">
          <span className="text-xs uppercase tracking-widest text-[#1F1410]/30 mb-1">
            Expected Income
          </span>
          <span className="text-3xl font-light text-[#1F1410]">
            ${expectedIncome.toLocaleString()}
          </span>
        </div>

        {/* Needs */}
        <div className="bg-[#10B981]/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Shield className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="text-xs font-semibold text-[#10B981]">
              Needs
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-light text-[#1F1410]">
              ${needsBudget.toLocaleString()}
            </span>
            <span className="text-xs text-[#1F1410]/40">
              {pct(needsBudget)}%
            </span>
          </div>
        </div>

        {/* Wants */}
        <div className="bg-[#A855F7]/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />
            <span className="text-xs font-semibold text-[#A855F7]">
              Wants
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-light text-[#1F1410]">
              ${wantsBudget.toLocaleString()}
            </span>
            <span className="text-xs text-[#1F1410]/40">
              {pct(wantsBudget)}%
            </span>
          </div>
        </div>

        {/* Savings */}
        <div className="bg-[#38BDF8]/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <PiggyBank className="w-3.5 h-3.5 text-[#38BDF8]" />
            <span className="text-xs font-semibold text-[#38BDF8]">
              Savings
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-light text-[#1F1410]">
              ${savingsBudget.toLocaleString()}
            </span>
            <span className="text-xs text-[#1F1410]/40">
              {pct(savingsBudget)}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
