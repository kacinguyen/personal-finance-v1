import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  BarChart3,
  CircleDollarSign,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/format'
import { STATUS_COLORS, CHART_COLORS, TAB_COLORS } from '../../lib/colors'
import { getMonthRange, getMonthData } from '../../lib/dateUtils'
import { useExpectedIncome } from '../../hooks/useExpectedIncome'
import { useMonthlyGoalContributions } from '../../hooks/useMonthlyGoalContributions'
import { useCategories } from '../../hooks/useCategories'
import { useMonthlySummary } from '../../hooks/useMonthlySummary'
import { MonthPicker } from '../common/MonthPicker'
import { getIcon } from '../../lib/iconMap'
import { withOpacity } from '../../lib/colors'

type YearlyChartData = {
  month: string
  monthIndex: number
  spent: number
  income: number
  cumulativeIncome: number | null
  cumulativeSpent: number | null
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type DashboardViewProps = {
  selectedMonth: Date
  onMonthChange: (month: Date) => void
}

export function DashboardView({ selectedMonth, onMonthChange }: DashboardViewProps) {
  const [yearlyChartData, setYearlyChartData] = useState<YearlyChartData[]>([])
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear())

  // Use shared hook for expected income
  const { expectedIncome, loading: incomeLoading } = useExpectedIncome(selectedMonth)
  const { totalContributions: goalContributions, loading: goalsLoading } = useMonthlyGoalContributions(selectedMonth)
  const { categories: dbCategories, findCategoryById } = useCategories()
  const { summary, categorySummaries } = useMonthlySummary(selectedMonth)

  const totalSpent = summary?.total_spending ?? 0
  const totalBudget = summary?.total_budget ?? 0

  // Average monthly spending (trailing 6 months)
  const [avgMonthlySpending, setAvgMonthlySpending] = useState<number | null>(null)
  const [topCategory, setTopCategory] = useState<{ name: string; count: number } | null>(null)
  // Largest outflow transaction this month
  const [largestOutflow, setLargestOutflow] = useState<{ name: string; amount: number } | null>(null)

  // Category IDs to exclude from spending (income + transfers)
  const excludedCategoryIds = useMemo(() => {
    return new Set(
      dbCategories
        .filter(c => c.category_type === 'income' || c.category_type === 'transfer')
        .map(c => c.id)
    )
  }, [dbCategories])

  // Category IDs that count as income
  const incomeCategoryIds = useMemo(() => {
    return new Set(
      dbCategories
        .filter(c => c.category_type === 'income')
        .map(c => c.id)
    )
  }, [dbCategories])

  // Top 5 spending categories
  const topCategories = useMemo(() => {
    const expenseTypes = new Set(['need', 'want'])
    const filtered = categorySummaries.filter(cs => expenseTypes.has(cs.category_type))
    return filtered.slice(0, 5).map(cs => {
      const cat = findCategoryById(cs.category_id)
      return {
        id: cs.category_id,
        name: cat?.name ?? 'Unknown',
        icon: cat?.icon ?? null,
        color: cat?.color ?? '#6B7280',
        amount: cs.total_amount,
      }
    })
  }, [categorySummaries, findCategoryById])


  // Fetch average monthly spending (trailing 6 completed months)
  useEffect(() => {
    const fetchAvgMonthly = async () => {
      if (dbCategories.length === 0) return

      const now = new Date()
      // Go back 6 full months from the start of the current month
      const end = new Date(now.getFullYear(), now.getMonth(), 0) // last day of prev month
      const start = new Date(now.getFullYear(), now.getMonth() - 6, 1) // first day 6 months ago

      const { data, error } = await supabase
        .from('transactions')
        .select('amount, date, category_id, goal_id')
        .gte('date', start.toISOString().split('T')[0])
        .lte('date', end.toISOString().split('T')[0])
        .eq('needs_review', false)

      if (error) {
        console.error('Error fetching avg monthly spending:', error)
        return
      }

      if (data && data.length > 0) {
        // Group by month, excluding income/transfer categories and goal-funded transactions
        const monthTotals = new Map<string, number>()
        const categoryCounts = new Map<string, number>()
        for (const t of data) {
          if (t.category_id && excludedCategoryIds.has(t.category_id)) continue
          if (t.goal_id) continue
          const monthKey = t.date.slice(0, 7)
          monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + Math.abs(Number(t.amount)))
          if (t.category_id) {
            categoryCounts.set(t.category_id, (categoryCounts.get(t.category_id) ?? 0) + 1)
          }
        }
        const months = Array.from(monthTotals.values())
        if (months.length > 0) {
          setAvgMonthlySpending(months.reduce((a, b) => a + b, 0) / months.length)
        }
        // Find most frequent category
        if (categoryCounts.size > 0) {
          const [topId, topCount] = Array.from(categoryCounts.entries()).reduce((a, b) => b[1] > a[1] ? b : a)
          const cat = findCategoryById(topId)
          setTopCategory({ name: cat?.name ?? 'Unknown', count: topCount })
        }
      }
    }
    fetchAvgMonthly()
  }, [dbCategories, excludedCategoryIds])

  // Available years for the chart (current year and 2 previous)
  const currentYear = new Date().getFullYear()
  const availableYears = [currentYear - 2, currentYear - 1, currentYear]

  // Calculate month data based on selected month
  const monthData = useMemo(() => getMonthData(selectedMonth), [selectedMonth])

  // Average spending per day
  const spendingPerDay = useMemo(() => {
    const elapsed = monthData.daysElapsed
    if (elapsed === 0) return { avgPerDay: 0, projected: 0 }
    const avgPerDay = totalSpent / elapsed
    const projected = avgPerDay * monthData.daysInMonth
    return { avgPerDay, projected }
  }, [totalSpent, monthData.daysElapsed, monthData.daysInMonth])

  // Fetch largest outflow transaction for selected month
  const fetchLargestOutflow = useCallback(async () => {
    const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, category_id, merchant, goal_id')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .eq('needs_review', false)

    if (error) {
      console.error('Error fetching transactions:', error)
    } else if (data) {
      const expenses = data.filter(t =>
        (!t.category_id || !excludedCategoryIds.has(t.category_id)) && !t.goal_id
      )

      if (expenses.length > 0) {
        const largest = expenses.reduce((max, t) =>
          Math.abs(Number(t.amount)) > Math.abs(Number(max.amount)) ? t : max
        )
        setLargestOutflow({ name: largest.merchant ?? 'Unknown', amount: Math.abs(Number(largest.amount)) })
      } else {
        setLargestOutflow(null)
      }
    }
  }, [selectedMonth, excludedCategoryIds])

  // Fetch yearly data for chart
  const fetchYearlyData = useCallback(async () => {
    // Wait for categories to load before fetching — filtering requires category IDs
    if (dbCategories.length === 0) return

    const startOfYear = `${chartYear}-01-01`
    const endOfYear = `${chartYear}-12-31`

    // Fetch all transactions for the year (include category_id for filtering)
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('amount, date, category_id')
      .gte('date', startOfYear)
      .lte('date', endOfYear)
      .eq('needs_review', false)

    if (txError) {
      console.error('Error fetching yearly transactions:', txError)
    }

    // Group transactions by month (excluding income & transfer categories)
    const spentByMonth: Record<number, number> = {}
    // Group income by month (income-category transactions only)
    const incomeByMonth: Record<number, number> = {}

    transactions?.forEach((t) => {
      // Parse date as local (not UTC) to avoid timezone-shifting months
      const month = new Date(t.date + 'T00:00:00').getMonth()
      if (t.category_id && incomeCategoryIds.has(t.category_id)) {
        incomeByMonth[month] = (incomeByMonth[month] || 0) + Math.abs(Number(t.amount))
      } else if (!t.category_id || !excludedCategoryIds.has(t.category_id)) {
        spentByMonth[month] = (spentByMonth[month] || 0) + Math.abs(Number(t.amount))
      }
    })

    // Build cumulative chart data for all 12 months
    const now = new Date()
    const isCurrentYear = chartYear === now.getFullYear()
    const currentMonthIndex = now.getMonth()

    let cumIncome = 0
    let cumSpent = 0
    const chartData: YearlyChartData[] = MONTH_NAMES.map((name, index) => {
      const hasData = !isCurrentYear || index <= currentMonthIndex
      const monthIncome = Math.round(incomeByMonth[index] || 0)
      const monthSpent = Math.round(spentByMonth[index] || 0)
      if (hasData) {
        cumIncome += monthIncome
        cumSpent += monthSpent
      }
      return {
        month: name,
        monthIndex: index,
        spent: monthSpent,
        income: monthIncome,
        cumulativeIncome: hasData ? cumIncome : null,
        cumulativeSpent: hasData ? cumSpent : null,
      }
    })

    setYearlyChartData(chartData)
  }, [chartYear, excludedCategoryIds, incomeCategoryIds, dbCategories.length])

  // Fetch data when selected month changes
  useEffect(() => {
    fetchLargestOutflow()
  }, [fetchLargestOutflow, selectedMonth])

  // Fetch chart data when chart year changes
  useEffect(() => {
    fetchYearlyData()
  }, [fetchYearlyData])

  const budgetTracking = useMemo(() => {
    const percentageOfBudget = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    const remainingIncome = expectedIncome - totalSpent - goalContributions

    return {
      remainingIncome,
      percentageOfBudget,
    }
  }, [totalBudget, totalSpent, expectedIncome, goalContributions])

  // Custom tooltip for the cumulative chart
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const income = payload.find((p) => p.dataKey === 'cumulativeIncome')?.value
      const spent = payload.find((p) => p.dataKey === 'cumulativeSpent')?.value
      if (income == null && spent == null) return null
      const savings = (income || 0) - (spent || 0)
      return (
        <div className="bg-white rounded-xl p-3 shadow-lg border border-[#1F1410]/5">
          <p className="text-sm font-bold text-[#1F1410] mb-2">{label}</p>
          <p className="text-xs" style={{ color: CHART_COLORS.income }}>
            Cumulative Income: {formatCurrency(income || 0)}
          </p>
          <p className="text-xs" style={{ color: CHART_COLORS.spent }}>
            Cumulative Expenses: {formatCurrency(spent || 0)}
          </p>
          <p className="text-xs font-semibold mt-1" style={{ color: savings >= 0 ? '#10B981' : '#FF6B6B' }}>
            Total Savings: {formatCurrency(savings)}
          </p>
        </div>
      )
    }
    return null
  }

  const cardBorder = 'border border-[#1F1410]/5'

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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-[#1F1410]">Dashboard</h1>
            <MonthPicker selectedMonth={selectedMonth} onMonthChange={onMonthChange} />
          </div>
        </motion.div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Spent */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={`bg-white rounded-2xl p-6 ${cardBorder}`}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/30 mb-2">Total Spent</p>
            <p className="text-3xl font-light text-[#1F1410]">{formatCurrency(totalSpent)}</p>
          </motion.div>

          {/* Expected Income */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className={`bg-white rounded-2xl p-6 ${cardBorder}`}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/30 mb-2">Expected Income</p>
            {incomeLoading ? (
              <div className="h-9 w-24 bg-[#1F1410]/5 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-light text-[#1F1410]">{formatCurrency(expectedIncome)}</p>
            )}
          </motion.div>

          {/* Remaining */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className={`bg-white rounded-2xl p-6 ${cardBorder}`}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/30 mb-2">Remaining</p>
            {incomeLoading || goalsLoading ? (
              <div className="h-9 w-24 bg-[#1F1410]/5 rounded-lg animate-pulse" />
            ) : (
              <p className="text-3xl font-light" style={{ color: STATUS_COLORS.success }}>
                {formatCurrency(budgetTracking.remainingIncome)}
              </p>
            )}
          </motion.div>

          {/* Days Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className={`bg-white rounded-2xl p-6 ${cardBorder}`}
          >
            <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/30 mb-2">Days Left</p>
            <p className="text-3xl font-light text-[#1F1410]">{monthData.daysRemaining}</p>
          </motion.div>
        </div>

        {/* Insight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Top 5 Spending Categories */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className={`bg-white rounded-2xl p-6 ${cardBorder}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4" style={{ color: TAB_COLORS.expenses }} />
              <h3 className="text-sm font-semibold text-[#1F1410]">Top Categories</h3>
            </div>
            {topCategories.length === 0 ? (
              <p className="text-sm text-[#1F1410]/40">No spending data yet</p>
            ) : (
              <div className="space-y-3">
                {topCategories.map((cat) => {
                  const Icon = getIcon(cat.icon)
                  return (
                    <div key={cat.id} className="flex items-center gap-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: withOpacity(cat.color, 0.12) }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                      </div>
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="text-xs font-medium text-[#1F1410] truncate">{cat.name}</span>
                        <span className="text-sm font-semibold text-[#1F1410] ml-2">{formatCurrency(cat.amount)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Average Monthly Spending */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className={`bg-white rounded-2xl p-6 ${cardBorder}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4" style={{ color: TAB_COLORS.accounts }} />
              <h3 className="text-sm font-semibold text-[#1F1410]">Avg Monthly Spending</h3>
            </div>
            {avgMonthlySpending !== null ? (
              <>
                <p className="text-2xl font-light text-[#1F1410] mb-1">
                  {formatCurrency(avgMonthlySpending)}
                </p>
                <p className="text-xs text-[#1F1410]/40 mb-4">trailing 6 months</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#1F1410]/50">Projected year total</span>
                    <span className="font-semibold text-[#1F1410]">{formatCurrency(avgMonthlySpending * 12)}</span>
                  </div>
                  {totalBudget > 0 && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#1F1410]/50">Compared to budget</span>
                      <span
                        className="font-semibold"
                        style={{ color: avgMonthlySpending <= totalBudget ? STATUS_COLORS.success : STATUS_COLORS.error }}
                      >
                        {avgMonthlySpending <= totalBudget
                          ? `${formatCurrency(totalBudget - avgMonthlySpending)} under`
                          : `${formatCurrency(avgMonthlySpending - totalBudget)} over`}
                      </span>
                    </div>
                  )}
                  {topCategory && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#1F1410]/50">Most frequent category</span>
                      <span className="font-semibold text-[#1F1410]">{topCategory.name} · {topCategory.count} txns</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <BarChart3 className="w-8 h-8 text-[#1F1410]/10 mb-2" />
                <p className="text-sm text-[#1F1410]/40">Not enough data</p>
              </div>
            )}
          </motion.div>

          {/* Average Spending Per Day */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
            className={`bg-white rounded-2xl p-6 ${cardBorder}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <CircleDollarSign className="w-4 h-4" style={{ color: TAB_COLORS.budget }} />
              <h3 className="text-sm font-semibold text-[#1F1410]">Daily Spending</h3>
            </div>
            <p className="text-2xl font-light text-[#1F1410] mb-1">
              {formatCurrency(spendingPerDay.avgPerDay)}
            </p>
            <p className="text-xs text-[#1F1410]/40 mb-4">per day average</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#1F1410]/50">Projected month total</span>
                <span className="font-semibold text-[#1F1410]">{formatCurrency(spendingPerDay.projected)}</span>
              </div>
              {totalBudget > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#1F1410]/50">Compared to budget</span>
                  <span
                    className="font-semibold"
                    style={{ color: spendingPerDay.projected <= totalBudget ? STATUS_COLORS.success : STATUS_COLORS.error }}
                  >
                    {spendingPerDay.projected <= totalBudget ? 'On track' : `${formatCurrency(spendingPerDay.projected - totalBudget)} over`}
                  </span>
                </div>
              )}
              {largestOutflow && (
                <div className="flex items-center justify-between text-xs min-w-0">
                  <span className="text-[#1F1410]/50 shrink-0 mr-2">Largest outflow</span>
                  <span className="font-semibold text-[#1F1410] truncate min-w-0 text-right">{largestOutflow.name} · {formatCurrency(largestOutflow.amount)}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Yearly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.4 }}
          className={`bg-white rounded-2xl p-6 mb-8 ${cardBorder}`}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-[#1F1410] mb-1">Yearly Overview</h2>
              <p className="text-sm text-[#1F1410]/50">Cumulative income vs expenses</p>
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
              <AreaChart data={yearlyChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="spentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="cumulativeIncome"
                  name="Cumulative Income"
                  stroke={CHART_COLORS.income}
                  strokeWidth={2.5}
                  fill="url(#incomeGradient)"
                  dot={{ fill: CHART_COLORS.income, strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls={false}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeSpent"
                  name="Cumulative Expenses"
                  stroke={CHART_COLORS.spent}
                  strokeWidth={2.5}
                  fill="url(#spentGradient)"
                  dot={{ fill: CHART_COLORS.spent, strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </motion.div>

      </div>
    </div>
  )
}
