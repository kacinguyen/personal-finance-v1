import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  TrendingUp,
  Wallet,
  DollarSign,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { GoalContributionSource } from '../types/rsuVest'

type Contribution = {
  id: string
  amount: number
  contribution_date: string
  source: GoalContributionSource
  notes: string | null
}

type GoalContributionHistoryProps = {
  goalId: string
  goalColor: string
  selectedMonth?: Date
}

// Source badge configuration
const SOURCE_CONFIG: Record<
  GoalContributionSource,
  { label: string; icon: React.ElementType; bgColor: string; textColor: string }
> = {
  manual: {
    label: 'Manual',
    icon: Wallet,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
  },
  paystub: {
    label: 'Paycheck',
    icon: FileText,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  transfer: {
    label: 'Transfer',
    icon: DollarSign,
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
  },
  interest: {
    label: 'Interest',
    icon: DollarSign,
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  rsu_vest: {
    label: 'RSU',
    icon: TrendingUp,
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  espp_purchase: {
    label: 'ESPP',
    icon: TrendingUp,
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
  },
}

export function GoalContributionHistory({ goalId, goalColor, selectedMonth }: GoalContributionHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  // Reset hasLoaded when selectedMonth changes
  useEffect(() => {
    setHasLoaded(false)
  }, [selectedMonth])

  // Fetch contributions when expanded
  useEffect(() => {
    if (isExpanded && !hasLoaded) {
      fetchContributions()
    }
  }, [isExpanded, hasLoaded, goalId, selectedMonth])

  const fetchContributions = async () => {
    setIsLoading(true)

    let query = supabase
      .from('goal_contributions')
      .select('id, amount, contribution_date, source, notes')
      .eq('goal_id', goalId)
      .order('contribution_date', { ascending: false })

    // Filter by selected month if provided
    if (selectedMonth) {
      const year = selectedMonth.getFullYear()
      const month = selectedMonth.getMonth()
      const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0]
      const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0]
      query = query.gte('contribution_date', startOfMonth).lte('contribution_date', endOfMonth)
    } else {
      query = query.limit(20)
    }

    const { data, error } = await query

    if (!error && data) {
      setContributions(data as Contribution[])
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

  return (
    <div className="mt-4 border-t border-[#1F1410]/10 pt-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm text-[#1F1410]/60 hover:text-[#1F1410]/80 transition-colors"
      >
        <span className="font-medium">Contribution History</span>
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
              ) : contributions.length === 0 ? (
                <p className="text-xs text-[#1F1410]/40 text-center py-3">
                  No contributions yet
                </p>
              ) : (
                contributions.map((contribution, index) => {
                  const sourceConfig = SOURCE_CONFIG[contribution.source] || SOURCE_CONFIG.manual
                  const Icon = sourceConfig.icon

                  return (
                    <motion.div
                      key={contribution.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#1F1410]/3 hover:bg-[#1F1410]/5 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {/* Source Badge */}
                        <div
                          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sourceConfig.bgColor} ${sourceConfig.textColor}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{sourceConfig.label}</span>
                        </div>

                        {/* Date */}
                        <span className="text-xs text-[#1F1410]/50">
                          {formatDate(contribution.contribution_date)}
                        </span>
                      </div>

                      {/* Amount */}
                      <span className="text-sm font-semibold" style={{ color: goalColor }}>
                        +${contribution.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </motion.div>
                  )
                })
              )}

              {!selectedMonth && contributions.length >= 20 && (
                <p className="text-xs text-[#1F1410]/40 text-center pt-2">
                  Showing last 20 contributions
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
