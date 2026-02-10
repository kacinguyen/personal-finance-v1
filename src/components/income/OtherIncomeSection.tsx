import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Transaction } from '../../types/transaction'

export type OtherIncomeCategory = {
  name: string
  amount: number
  icon: LucideIcon
  color: string
  count: number
  transactions: Transaction[]
}

type Props = {
  categories: OtherIncomeCategory[]
  total: number
  loading: boolean
}

export function OtherIncomeSection({ categories, total, loading }: Props) {
  if (categories.length === 0 && !loading) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.4 }}
      className="bg-white rounded-2xl p-6 shadow-sm"
      style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-[#1F1410]/70">Other Income</p>
        {total > 0 && (
          <span className="text-lg font-bold text-[#10B981]">
            ${total.toLocaleString()}
          </span>
        )}
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-[#10B981] animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const CatIcon = cat.icon
            return (
              <div key={cat.name}>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cat.color + '26' }}
                  >
                    <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1F1410]">{cat.name}</span>
                      <span className="text-xs text-[#1F1410]/40">
                        {cat.count} transaction{cat.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-[#1F1410]">
                      ${cat.amount.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="ml-11 space-y-1">
                  {cat.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-xs">
                      <span className="text-[#1F1410]/50">
                        {new Date(tx.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {tx.merchant ? ` — ${tx.merchant}` : ''}
                      </span>
                      <span className="text-[#1F1410]/60 font-medium">
                        ${Math.abs(tx.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
