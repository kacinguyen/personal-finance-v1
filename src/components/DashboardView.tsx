import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Calendar,
  Wallet,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { MonthPicker, getMonthRange, getMonthData } from './MonthPicker'

type YearlyChartData = {
  month: string
  monthIndex: number
  spent: number
  budget: number
  income: number
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function DashboardView() {
  const [totalSpent, setTotalSpent] = useState(0)
  const [expectedIncome, setExpectedIncome] = useState(0)
  const [totalBudget, setTotalBudget] = useState(0)
  const [yearlyChartData, setYearlyChartData] = useState<YearlyChartData[]>([])
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Available years for the chart (current year and 2 previous)
  const currentYear = new Date().getFullYear()
  const availableYears = [currentYear - 2, currentYear - 1, currentYear]

  // Calculate month data based on selected month
  const monthData = useMemo(() => {
    return getMonthData(selectedMonth)
  }, [selectedMonth])

  // Fetch total spent from transactions for selected month
  const fetchTotalSpent = useCallback(async () => {
    const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)

    const { data, error } = await supabase
      .from('transactions')
      .select('amount')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    if (error) {
      console.error('Error fetching transactions:', error)
    } else if (data) {
      const total = data.reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
      setTotalSpent(total)
    }
  }, [selectedMonth])

  // Fetch expected income from paystubs for selected month
  // Smart logic: use selected month if available, otherwise use most recent month's data
  const fetchExpectedIncome = useCallback(async () => {
    const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)

    // First try to get paystubs for the selected month
    const { data: selectedMonthData, error: selectedError } = await supabase
      .from('paystubs')
      .select('net_pay, pay_date')
      .gte('pay_date', startOfMonth)
      .lte('pay_date', endOfMonth)

    if (selectedError) {
      console.error('Error fetching paystubs:', selectedError)
      return
    }

    if (selectedMonthData && selectedMonthData.length > 0) {
      const total = selectedMonthData.reduce((sum, p) => sum + Number(p.net_pay), 0)
      setExpectedIncome(total)
      return
    }

    // No data for selected month - fetch recent data to use as estimate
    const sixMonthsAgo = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 6, 1).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('paystubs')
      .select('net_pay, pay_date')
      .gte('pay_date', sixMonthsAgo)
      .order('pay_date', { ascending: false })

    if (error) {
      console.error('Error fetching paystubs:', error)
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
  }, [selectedMonth])

  // Fetch total budget from budgets
  const fetchTotalBudget = useCallback(async () => {
    const { data, error } = await supabase
      .from('budgets')
      .select('monthly_limit')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching budgets:', error)
    } else if (data) {
      const total = data.reduce((sum, b) => sum + Number(b.monthly_limit), 0)
      setTotalBudget(total)
    }
  }, [])

  // Fetch yearly data for chart
  const fetchYearlyData = useCallback(async () => {
    const startOfYear = `${chartYear}-01-01`
    const endOfYear = `${chartYear}-12-31`

    // Fetch all transactions for the year
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, date')
      .gte('date', startOfYear)
      .lte('date', endOfYear)

    if (txError) {
      console.error('Error fetching yearly transactions:', txError)
    }

    // Fetch all paystubs for the year
    const { data: paystubs, error: payError } = await supabase
      .from('paystubs')
      .select('net_pay, pay_date')
      .gte('pay_date', startOfYear)
      .lte('pay_date', endOfYear)

    if (payError) {
      console.error('Error fetching yearly paystubs:', payError)
    }

    // Fetch current budget (used for all months)
    const { data: budgets, error: budgetError } = await supabase
      .from('budgets')
      .select('monthly_limit')
      .eq('is_active', true)

    if (budgetError) {
      console.error('Error fetching budgets:', budgetError)
    }

    const monthlyBudget = budgets?.reduce((sum, b) => sum + Number(b.monthly_limit), 0) || 0

    // Group transactions by month
    const spentByMonth: Record<number, number> = {}
    transactions?.forEach((t) => {
      const month = new Date(t.date).getMonth()
      spentByMonth[month] = (spentByMonth[month] || 0) + Math.abs(Number(t.amount))
    })

    // Group income by month
    const incomeByMonth: Record<number, number> = {}
    paystubs?.forEach((p) => {
      const month = new Date(p.pay_date).getMonth()
      incomeByMonth[month] = (incomeByMonth[month] || 0) + Number(p.net_pay)
    })

    // Build chart data for all 12 months
    const now = new Date()
    const isCurrentYear = chartYear === now.getFullYear()
    const currentMonthIndex = now.getMonth()

    const chartData: YearlyChartData[] = MONTH_NAMES.map((name, index) => {
      // For past years, show budget for all months
      // For current year, only show budget up to current month
      const showBudget = !isCurrentYear || index <= currentMonthIndex
      return {
        month: name,
        monthIndex: index,
        spent: Math.round(spentByMonth[index] || 0),
        budget: showBudget ? monthlyBudget : 0,
        income: Math.round(incomeByMonth[index] || 0),
      }
    })

    setYearlyChartData(chartData)
  }, [chartYear])

  // Fetch data when selected month changes
  useEffect(() => {
    fetchTotalSpent()
    fetchExpectedIncome()
    fetchTotalBudget()
  }, [fetchTotalSpent, fetchExpectedIncome, fetchTotalBudget, selectedMonth])

  // Fetch chart data when chart year changes
  useEffect(() => {
    fetchYearlyData()
  }, [fetchYearlyData])

  const budgetTracking = useMemo(() => {
    const expectedSpending = (totalBudget * monthData.daysElapsed) / monthData.daysInMonth
    const difference = totalSpent - expectedSpending
    const percentageOfBudget = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    const remainingIncome = expectedIncome - totalSpent
    const percentageOfIncome = expectedIncome > 0 ? (totalSpent / expectedIncome) * 100 : 0

    let status: 'under' | 'on-track' | 'over'
    let statusColor: string
    let statusText: string

    if (difference < -totalBudget * 0.1) {
      status = 'under'
      statusColor = '#10B981'
      statusText = 'Under budget'
    } else if (difference > totalBudget * 0.1) {
      status = 'over'
      statusColor = '#FF6B6B'
      statusText = 'Over budget'
    } else {
      status = 'on-track'
      statusColor = '#F59E0B'
      statusText = 'On track'
    }

    return {
      totalBudget,
      expectedSpending,
      difference,
      remainingIncome,
      percentageOfIncome,
      percentageOfBudget,
      status,
      statusColor,
      statusText,
    }
  }, [totalBudget, totalSpent, expectedIncome, monthData])

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl p-3 shadow-lg border border-[#1F1410]/5">
          <p className="text-sm font-bold text-[#1F1410] mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: ${entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-12 h-12 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center"
            >
              <LayoutDashboard className="w-6 h-6 text-[#F59E0B]" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Dashboard</h1>
          </div>
          <p className="text-[#1F1410]/60 text-lg">Your financial overview</p>
        </motion.div>

        {/* Month Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="flex justify-center mb-6"
        >
          <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        </motion.div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Spent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1F1410]/50">Total Spent</p>
              <ArrowUpRight className="w-4 h-4 text-[#FF6B6B]" />
            </div>
            <p className="text-3xl font-bold text-[#1F1410] mb-1">${totalSpent.toLocaleString()}</p>
            <p className="text-xs text-[#1F1410]/40">{Math.round(budgetTracking.percentageOfBudget)}% of budget</p>
          </motion.div>

          {/* Expected Income */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1F1410]/50">Expected Income</p>
              <ArrowDownRight className="w-4 h-4 text-[#10B981]" />
            </div>
            <p className="text-3xl font-bold text-[#1F1410] mb-1">${expectedIncome.toLocaleString()}</p>
            <p className="text-xs text-[#1F1410]/40">This month</p>
          </motion.div>

          {/* Remaining */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1F1410]/50">Remaining</p>
              <Wallet className="w-4 h-4 text-[#10B981]" />
            </div>
            <p className="text-3xl font-bold text-[#10B981] mb-1">${budgetTracking.remainingIncome.toLocaleString()}</p>
            <p className="text-xs text-[#1F1410]/40">From income</p>
          </motion.div>

          {/* Days Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-[#1F1410]/50">Days Left</p>
              <Calendar className="w-4 h-4 text-[#F59E0B]" />
            </div>
            <p className="text-3xl font-bold text-[#1F1410] mb-1">{monthData.daysRemaining}</p>
            <p className="text-xs text-[#1F1410]/40">In {monthData.monthName}</p>
          </motion.div>
        </div>

        {/* Budget Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="bg-white rounded-2xl p-8 shadow-sm mb-8"
          style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#1F1410] mb-1">Budget Status</h2>
              <p className="text-sm text-[#1F1410]/50">Track your spending against your monthly budget</p>
            </div>
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.7 }}
              >
                {budgetTracking.status === 'under' ? (
                  <TrendingDown className="w-6 h-6" style={{ color: budgetTracking.statusColor }} />
                ) : (
                  <TrendingUp className="w-6 h-6" style={{ color: budgetTracking.statusColor }} />
                )}
              </motion.div>
              <span className="font-bold text-xl" style={{ color: budgetTracking.statusColor }}>
                {budgetTracking.statusText}
              </span>
            </div>
          </div>

          {/* Progress Bars */}
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm text-[#1F1410]/60 mb-2">
                <span>Spent vs Budget</span>
                <span className="font-semibold text-[#1F1410]">
                  ${totalSpent.toLocaleString()} / ${totalBudget.toLocaleString()}
                </span>
              </div>
              <div className="h-3 bg-[#1F1410]/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetTracking.percentageOfBudget, 100)}%` }}
                  transition={{ duration: 1, delay: 0.8, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: budgetTracking.statusColor }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm text-[#1F1410]/60 mb-2">
                <span>Spent vs Income</span>
                <span className="font-semibold text-[#1F1410]">
                  {Math.round(budgetTracking.percentageOfIncome)}% used
                </span>
              </div>
              <div className="h-3 bg-[#1F1410]/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetTracking.percentageOfIncome, 100)}%` }}
                  transition={{ duration: 1, delay: 0.9, ease: 'easeOut' }}
                  className="h-full rounded-full bg-[#10B981]"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Yearly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-sm mb-8"
          style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#1F1410] mb-1">Yearly Overview</h2>
              <p className="text-sm text-[#1F1410]/50">Budget vs actual spending and income trend</p>
            </div>

            {/* Year Selector */}
            <div className="flex items-center gap-1 bg-[#1F1410]/5 rounded-lg p-1">
              <button
                onClick={() => setChartYear(y => Math.max(availableYears[0], y - 1))}
                disabled={chartYear <= availableYears[0]}
                className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 text-[#1F1410]/60" />
              </button>
              <div className="flex gap-1">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => setChartYear(year)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      chartYear === year
                        ? 'bg-white text-[#1F1410] shadow-sm'
                        : 'text-[#1F1410]/50 hover:text-[#1F1410]/70'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setChartYear(y => Math.min(availableYears[availableYears.length - 1], y + 1))}
                disabled={chartYear >= availableYears[availableYears.length - 1]}
                className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4 text-[#1F1410]/60" />
              </button>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yearlyChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(31, 20, 16, 0.08)" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: 'rgba(31, 20, 16, 0.5)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(31, 20, 16, 0.1)' }}
                />
                <YAxis
                  tick={{ fill: 'rgba(31, 20, 16, 0.5)', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(31, 20, 16, 0.1)' }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-[#1F1410]/70">{value}</span>}
                />
                <Bar
                  dataKey="budget"
                  name="Budget"
                  fill="rgba(31, 20, 16, 0.1)"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Bar
                  dataKey="spent"
                  name="Actual Spent"
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Legend Summary */}
          <div className="flex flex-wrap gap-6 mt-4 pt-4 border-t border-[#1F1410]/5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#1F1410]/10" />
              <span className="text-xs text-[#1F1410]/60">Budget (Monthly Target)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <span className="text-xs text-[#1F1410]/60">Actual Spending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span className="text-xs text-[#1F1410]/60">Income Trend</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
