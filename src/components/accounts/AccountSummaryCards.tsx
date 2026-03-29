import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { TAB_COLORS } from '../../lib/colors'
import { formatCurrency } from '../views/AccountsView'

type AccountSummaryCardsProps = {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
}

export function AccountSummaryCards({
  netWorth,
  totalAssets,
  totalLiabilities,
}: AccountSummaryCardsProps) {
  const total = totalAssets + totalLiabilities
  const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-2xl p-6 mb-8 border border-[#1F1410]/5"
    >
      <div className="grid grid-cols-2 sm:grid-cols-[2fr_1fr_1fr] gap-3">
        {/* Net Worth */}
        <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
          <span className="text-xs uppercase tracking-widest text-[#1F1410]/30 mb-1">
            Net Worth
          </span>
          <span
            className="text-3xl font-light"
            style={{ color: TAB_COLORS.accounts }}
          >
            {formatCurrency(netWorth)}
          </span>
        </div>

        {/* Assets */}
        <div className="bg-[#10B981]/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="text-xs font-semibold text-[#10B981]">
              Assets
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-light text-[#1F1410]">
              {formatCurrency(totalAssets)}
            </span>
            <span className="text-xs text-[#1F1410]/40">
              {pct(totalAssets)}%
            </span>
          </div>
        </div>

        {/* Liabilities */}
        <div className="bg-[#EF4444]/5 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-[#EF4444]" />
            <span className="text-xs font-semibold text-[#EF4444]">
              Liabilities
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-light text-[#1F1410]">
              {formatCurrency(totalLiabilities)}
            </span>
            <span className="text-xs text-[#1F1410]/40">
              {pct(totalLiabilities)}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
