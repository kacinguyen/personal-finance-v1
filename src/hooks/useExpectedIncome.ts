/**
 * Hook for fetching expected income from paystubs
 * Smart logic: uses selected month if available, otherwise uses most recent month's data
 */

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getMonthRange } from '../lib/dateUtils'

type UseExpectedIncomeResult = {
  expectedIncome: number
  loading: boolean
  refetch: () => Promise<void>
}

export function useExpectedIncome(selectedMonth: Date): UseExpectedIncomeResult {
  const [expectedIncome, setExpectedIncome] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchExpectedIncome = useCallback(async () => {
    setLoading(true)
    try {
      const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)

      // First try to get paystubs for the selected month
      const { data: selectedMonthData, error: selectedError } = await supabase
        .from('paystubs')
        .select('net_pay, pay_date')
        .gte('pay_date', startOfMonth)
        .lte('pay_date', endOfMonth)

      if (selectedError) {
        console.error('Error fetching paystubs:', selectedError)
        setExpectedIncome(0)
        return
      }

      if (selectedMonthData && selectedMonthData.length > 0) {
        const total = selectedMonthData.reduce((sum, p) => sum + Number(p.net_pay), 0)
        setExpectedIncome(total)
        return
      }

      // No data for selected month - fetch recent data to use as estimate
      const sixMonthsAgo = new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth() - 6,
        1
      ).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('paystubs')
        .select('net_pay, pay_date')
        .gte('pay_date', sixMonthsAgo)
        .order('pay_date', { ascending: false })

      if (error) {
        console.error('Error fetching paystubs:', error)
        setExpectedIncome(0)
        return
      }

      if (!data || data.length === 0) {
        setExpectedIncome(0)
        return
      }

      // Group paystubs by month and use most recent
      const paysByMonth: Record<string, number> = {}
      data.forEach((p) => {
        const payDate = new Date(p.pay_date)
        const monthKey = `${payDate.getFullYear()}-${payDate.getMonth()}`
        paysByMonth[monthKey] = (paysByMonth[monthKey] || 0) + Number(p.net_pay)
      })

      const sortedMonths = Object.keys(paysByMonth).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number)
        const [yearB, monthB] = b.split('-').map(Number)
        return yearB - yearA || monthB - monthA
      })

      if (sortedMonths.length > 0) {
        setExpectedIncome(paysByMonth[sortedMonths[0]])
      } else {
        setExpectedIncome(0)
      }
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  useEffect(() => {
    fetchExpectedIncome()
  }, [fetchExpectedIncome])

  return { expectedIncome, loading, refetch: fetchExpectedIncome }
}
