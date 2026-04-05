/**
 * Hook for fetching total goal contributions in a given month.
 * Used by the dashboard to subtract savings allocations from remaining income.
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getMonthRange } from '../lib/dateUtils'

type UseMonthlyGoalContributionsResult = {
  totalContributions: number
  loading: boolean
  refetch: () => Promise<void>
}

export function useMonthlyGoalContributions(selectedMonth: Date): UseMonthlyGoalContributionsResult {
  const [totalContributions, setTotalContributions] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchContributions = useCallback(async () => {
    setLoading(true)
    try {
      const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)

      const { data, error } = await supabase
        .from('goal_contributions')
        .select('amount')
        .gte('contribution_date', startOfMonth)
        .lte('contribution_date', endOfMonth)

      if (error) {
        console.error('Error fetching goal contributions:', error)
        setTotalContributions(0)
      } else {
        const total = (data || []).reduce((sum, row) => sum + Number(row.amount), 0)
        setTotalContributions(total)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchContributions()
  }, [fetchContributions])

  return { totalContributions, loading, refetch: fetchContributions }
}
