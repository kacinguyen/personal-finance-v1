import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from './useUser'
import type { MonthlySummary, MonthlyCategorySummary } from '../types/monthlySummary'

function toMonthStart(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

export function useMonthlySummary(month: Date) {
  const { userId } = useUser()
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [categorySummaries, setCategorySummaries] = useState<MonthlyCategorySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const monthStr = toMonthStart(month)

  const fetchSummary = useCallback(async () => {
    if (!userId) {
      setSummary(null)
      setCategorySummaries([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const [summaryResult, categoryResult] = await Promise.all([
      supabase
        .from('monthly_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('month', monthStr)
        .maybeSingle(),
      supabase
        .from('monthly_category_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('month', monthStr)
        .order('total_amount', { ascending: false }),
    ])

    if (summaryResult.error) {
      setError(summaryResult.error.message)
      setLoading(false)
      return
    }
    if (categoryResult.error) {
      setError(categoryResult.error.message)
      setLoading(false)
      return
    }

    setSummary(summaryResult.data)
    setCategorySummaries(categoryResult.data ?? [])
    setLoading(false)
  }, [userId, monthStr])

  const refresh = useCallback(async () => {
    if (!userId) return

    setRefreshing(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc('refresh_monthly_summary', {
      p_user_id: userId,
      p_month: monthStr,
    })

    if (rpcError) {
      setError(rpcError.message)
      setRefreshing(false)
      return
    }

    await fetchSummary()
    setRefreshing(false)
  }, [userId, monthStr, fetchSummary])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return {
    summary,
    categorySummaries,
    loading,
    refreshing,
    error,
    refresh,
    refetch: fetchSummary,
  }
}
