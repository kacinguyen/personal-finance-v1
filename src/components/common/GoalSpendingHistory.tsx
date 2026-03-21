import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Expense = {
  id: string
  merchant: string
  amount: number
  date: string
  category: string
}

type GoalSpendingHistoryProps = {
  goalId: string
  goalColor: string
}

export function GoalSpendingHistory({ goalId, goalColor }: GoalSpendingHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [totalSpent, setTotalSpent] = useState(0)
  const [hasExpenses, setHasExpenses] = useState<boolean | null>(null)

  // Check if there are any expenses on mount (lightweight query)
  useEffect(() => {
    async function checkExpenses() {
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('goal_id', goalId)
        .lt('amount', 0)

      setHasExpenses((count ?? 0) > 0)
    }
    checkExpenses()
  }, [goalId])

  // Fetch full data when expanded
  useEffect(() => {
    if (isExpanded && !hasLoaded) {
      fetchExpenses()
    }
  }, [isExpanded, hasLoaded, goalId])

  const fetchExpenses = async () => {
    setIsLoading(true)

    const [txResult, totalResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('id, merchant, amount, date, category')
        .eq('goal_id', goalId)
        .lt('amount', 0)
        .order('date', { ascending: false })
        .limit(20),
      supabase
        .from('transactions')
        .select('amount')
        .eq('goal_id', goalId)
        .lt('amount', 0),
    ])

    if (!txResult.error && txResult.data) {
      setExpenses(txResult.data)
    }
    if (!totalResult.error && totalResult.data) {
      setTotalSpent(totalResult.data.reduce((sum, tx) => sum + Math.abs(tx.amount), 0))
    }
    setIsLoading(false)
    setHasLoaded(true)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Don't render if no expenses exist
  if (hasExpenses === false) return null
  // Still loading the initial check
  if (hasExpenses === null) return null

  return (
    <div className="mt-4 border-t border-[#1F1410]/10 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm text-[#1F1410]/60 hover:text-[#1F1410]/80 transition-colors"
      >
        <span className="font-medium">Spending History</span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" style={{ color: goalColor }} />
                </div>
              ) : expenses.length === 0 ? (
                <p className="text-xs text-[#1F1410]/40 text-center py-3">
                  No expenses linked yet
                </p>
              ) : (
                <>
                  {/* Total spent summary */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ backgroundColor: `${goalColor}08` }}>
                    <span className="text-xs font-medium text-[#1F1410]/50 uppercase tracking-wide">Total Spent</span>
                    <span className="text-sm font-semibold" style={{ color: goalColor }}>
                      ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {expenses.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1F1410]/3 hover:bg-[#1F1410]/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Merchant name */}
                        <span className="text-sm text-[#1F1410] truncate">{tx.merchant}</span>

                        {/* Category pill */}
                        <span
                          className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{ backgroundColor: `${goalColor}12`, color: `${goalColor}cc` }}
                        >
                          {tx.category}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Date */}
                        <span className="text-xs text-[#1F1410]/50">
                          {formatDate(tx.date)}
                        </span>

                        {/* Amount */}
                        <span className="text-sm font-semibold text-[#1F1410]">
                          -${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {expenses.length >= 20 && (
                    <p className="text-xs text-[#1F1410]/40 text-center pt-2">
                      Showing last 20 expenses
                    </p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
