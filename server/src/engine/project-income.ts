/**
 * Server-side income projection.
 *
 * Mirrors the client-side useExpectedIncome hook logic:
 * - 2+ salary transactions → use actual total
 * - 1 salary transaction → project 2× (second check expected)
 * - 0 salary transactions → use previous month's salary total
 * Non-salary income is always summed from actuals.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

function getMonthRange(month: string): { start: string; end: string } {
  const d = new Date(month + 'T00:00:00')
  const year = d.getFullYear()
  const m = d.getMonth()
  const start = `${year}-${String(m + 1).padStart(2, '0')}-01`
  const lastDay = new Date(year, m + 1, 0).getDate()
  const end = `${year}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function getPrevMonth(month: string): string {
  const d = new Date(month + 'T00:00:00')
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-01`
}

export async function projectMonthlyIncome(
  supabase: SupabaseClient,
  userId: string,
  targetMonth: string, // YYYY-MM-DD, first of month
): Promise<{ expectedIncome: number; isProjected: boolean; projectionBasis: 'actual' | 'one-check' | 'previous-month' }> {
  // Get income category IDs and identify salary
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, category_type')
    .eq('user_id', userId)
    .eq('category_type', 'income')
    .eq('is_active', true)

  const incomeCatIds = (categories || []).map(c => c.id)
  const salaryCatId = (categories || []).find(c => c.name === 'Salary')?.id

  if (incomeCatIds.length === 0) {
    return { expectedIncome: 0, isProjected: false, projectionBasis: 'actual' }
  }

  const { start, end } = getMonthRange(targetMonth)

  // Fetch current month income transactions
  const { data: currentTxns } = await supabase
    .from('transactions')
    .select('amount, category_id')
    .eq('user_id', userId)
    .in('category_id', incomeCatIds)
    .gte('date', start)
    .lte('date', end)

  const txns = currentTxns || []

  const salaryTxns = salaryCatId ? txns.filter(tx => tx.category_id === salaryCatId) : []
  const nonSalaryTxns = salaryCatId ? txns.filter(tx => tx.category_id !== salaryCatId) : txns

  const actualSalary = salaryTxns.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
  const nonSalaryTotal = nonSalaryTxns.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  let projectedSalary: number
  let basis: 'actual' | 'one-check' | 'previous-month'
  let isProjected: boolean

  if (salaryTxns.length >= 2) {
    projectedSalary = actualSalary
    basis = 'actual'
    isProjected = false
  } else if (salaryTxns.length === 1) {
    projectedSalary = actualSalary * 2
    basis = 'one-check'
    isProjected = true
  } else {
    // Fallback: previous month salary
    const prevMonth = getPrevMonth(targetMonth)
    const { start: prevStart, end: prevEnd } = getMonthRange(prevMonth)

    let prevSalaryTotal = 0
    if (salaryCatId) {
      const { data: prevData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', userId)
        .eq('category_id', salaryCatId)
        .gte('date', prevStart)
        .lte('date', prevEnd)

      prevSalaryTotal = (prevData || []).reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    }

    projectedSalary = prevSalaryTotal
    basis = 'previous-month'
    isProjected = prevSalaryTotal > 0
  }

  return {
    expectedIncome: projectedSalary + nonSalaryTotal,
    isProjected,
    projectionBasis: basis,
  }
}
