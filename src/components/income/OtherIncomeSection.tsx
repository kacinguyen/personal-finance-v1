import { Coins, Loader2 } from 'lucide-react'
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
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
          <Coins className="w-4 h-4 text-[#F59E0B]" />
        </div>
        <h3 className="text-sm font-bold text-[#1F1410]">Other Income</h3>
        {total > 0 && (
          <span className="ml-auto text-sm font-bold text-[#10B981]">
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
                <div className="flex items-center justify-between py-2 border-b border-[#1F1410]/5">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: cat.color + '15' }}
                    >
                      <CatIcon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                    </div>
                    <span className="text-sm font-medium text-[#1F1410]">{cat.name}</span>
                    <span className="text-xs text-[#1F1410]/40">
                      {cat.count} transaction{cat.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#1F1410]">
                    ${cat.amount.toLocaleString()}
                  </span>
                </div>
                <div className="ml-8 space-y-0.5">
                  {cat.transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-xs py-1">
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
    </div>
  )
}
