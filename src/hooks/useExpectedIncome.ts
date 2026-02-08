/**
 * Hook for calculating expected income from transactions with salary projection.
 *
 * Projection logic (for salary specifically):
 * - 2+ salary transactions this month → use actual total (all checks in)
 * - 1 salary transaction this month → project 2× that amount (second check expected)
 * - 0 salary transactions this month → use previous month's salary total as estimate
 *
 * Non-salary income is always summed from actuals (no projection).
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { getMonthRange } from '../lib/dateUtils'
import { useCategories } from './useCategories'

export type ProjectionBasis = 'actual' | 'one-check' | 'previous-month'

type UseExpectedIncomeResult = {
  expectedIncome: number
  loading: boolean
  isProjected: boolean
  projectionBasis: ProjectionBasis
  refetch: () => Promise<void>
}

export function useExpectedIncome(selectedMonth: Date): UseExpectedIncomeResult {
  const { incomeCategories } = useCategories()

  const incomeCategoryIds = useMemo(
    () => incomeCategories.map(c => c.id),
    [incomeCategories],
  )

  const salaryCategoryId = useMemo(
    () => incomeCategories.find(c => c.name === 'Salary')?.id,
    [incomeCategories],
  )

  // Current month income transactions
  const [currentMonthTxns, setCurrentMonthTxns] = useState<{ amount: number; category_id: string | null }[]>([])
  // Previous month salary transactions (for 0-check fallback)
  const [prevMonthSalaryTotal, setPrevMonthSalaryTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchIncome = useCallback(async () => {
    if (incomeCategoryIds.length === 0) {
      setCurrentMonthTxns([])
      setPrevMonthSalaryTotal(0)
      return
    }

    setLoading(true)
    try {
      const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)

      // Fetch current month income transactions
      const { data: currentData, error: currentError } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .in('category_id', incomeCategoryIds)
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)

      if (currentError) {
        console.error('Error fetching income transactions:', currentError)
        setCurrentMonthTxns([])
      } else {
        setCurrentMonthTxns(currentData || [])
      }

      // Fetch previous month salary transactions (for fallback)
      if (salaryCategoryId) {
        const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
        const { startOfMonth: prevStart, endOfMonth: prevEnd } = getMonthRange(prevMonth)

        const { data: prevData, error: prevError } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category_id', salaryCategoryId)
          .gte('date', prevStart)
          .lte('date', prevEnd)

        if (prevError) {
          console.error('Error fetching prev month salary:', prevError)
          setPrevMonthSalaryTotal(0)
        } else {
          const total = (prevData || []).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
          setPrevMonthSalaryTotal(total)
        }
      } else {
        setPrevMonthSalaryTotal(0)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, incomeCategoryIds, salaryCategoryId])

  useEffect(() => {
    fetchIncome()
  }, [fetchIncome])

  // Compute projected income
  const { expectedIncome, isProjected, projectionBasis } = useMemo(() => {
    // Split into salary vs non-salary
    const salaryTxns = salaryCategoryId
      ? currentMonthTxns.filter(tx => tx.category_id === salaryCategoryId)
      : []
    const nonSalaryTxns = salaryCategoryId
      ? currentMonthTxns.filter(tx => tx.category_id !== salaryCategoryId)
      : currentMonthTxns

    const actualSalary = salaryTxns.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const nonSalaryTotal = nonSalaryTxns.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

    let projectedSalary: number
    let basis: ProjectionBasis
    let projected: boolean

    if (salaryTxns.length >= 2) {
      // All checks in — use actual
      projectedSalary = actualSalary
      basis = 'actual'
      projected = false
    } else if (salaryTxns.length === 1) {
      // One check — double it
      projectedSalary = actualSalary * 2
      basis = 'one-check'
      projected = true
    } else {
      // No checks — use previous month
      projectedSalary = prevMonthSalaryTotal
      basis = 'previous-month'
      projected = prevMonthSalaryTotal > 0
    }

    return {
      expectedIncome: projectedSalary + nonSalaryTotal,
      isProjected: projected,
      projectionBasis: basis,
    }
  }, [currentMonthTxns, salaryCategoryId, prevMonthSalaryTotal])

  return { expectedIncome, loading, isProjected, projectionBasis, refetch: fetchIncome }
}
