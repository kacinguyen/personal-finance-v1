import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  CircleDollarSign,
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
import { supabase } from '../../lib/supabase'
import { formatCurrency } from '../../lib/format'
import { STATUS_COLORS, CHART_COLORS, TAB_COLORS } from '../../lib/colors'
import { getMonthRange, getMonthData } from '../../lib/dateUtils'
import { useExpectedIncome } from '../../hooks/useExpectedIncome'
import { useCategories } from '../../hooks/useCategories'
import { useMonthlySummary } from '../../hooks/useMonthlySummary'
import { MonthPicker } from '../common/MonthPicker'
import { getIcon } from '../../lib/iconMap'
import { withOpacity } from '../../lib/colors'

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
  const [totalBudget, setTotalBudget] = useState(0)
  const [yearlyChartData, setYearlyChartData] = useState<YearlyChartData[]>([])
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Use shared hook for expected income
  const { expectedIncome, loading: incomeLoading } = useExpectedIncome(selectedMonth)
  const { categories: dbCategories, findCategoryById } = useCategories()
  const { categorySummaries } = useMonthlySummary(selectedMonth)

  // RSU vest state
  const [nextVest, setNextVest] = useState<{
    vest_date: string
    shares_vested: number
    vest_price: number
    total_gross_value: number
    company_name: string | null
  } | null>(null)

  // Category IDs to exclude from spending (income + transfers)
  const excludedCategoryIds = useMemo(() => {
    return new Set(
      dbCategories
        .filter(c => c.category_type === 'income' || c.category_type === 'transfer')
        .map(c => c.id)
    )
  }, [dbCategories])

  // Top 5 spending categories
  const topCategories = useMemo(() => {
    const expenseTypes = new Set(['need', 'want', 'savings_funded'])
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


  // Fetch upcoming RSU vest
  useEffect(() => {
    const fetchNextVest = async () => {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('rsu_vests')
        .select('vest_date, shares_vested, vest_price, total_gross_value, company_name')
        .gte('vest_date', today)
        .order('vest_date', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!error && data) {
        setNextVest(data)
      } else {
        setNextVest(null)
      }
    }
    fetchNextVest()
  }, [])

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

  // Fetch total spent from transactions for selected month (expenses only)
  const fetchTotalSpent = useCallback(async () => {
    const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)

    const { data, error } = await supabase
      .from('transactions')
      .select('amount, category_id')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    if (error) {
      console.error('Error fetching transactions:', error)
    } else if (data) {
      const total = data
        .filter(t => !t.category_id || !excludedCategoryIds.has(t.category_id))
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
      setTotalSpent(total)
    }
  }, [selectedMonth, excludedCategoryIds])

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
    fetchTotalBudget()
  }, [fetchTotalSpent, fetchTotalBudget, selectedMonth])

  // Fetch chart data when chart year changes
  useEffect(() => {
    fetchYearlyData()
  }, [fetchYearlyData])

  const budgetTracking = useMemo(() => {
    const percentageOfBudget = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    const remainingIncome = expectedIncome - totalSpent

    return {
      remainingIncome,
      percentageOfBudget,
    }
  }, [totalBudget, totalSpent, expectedIncome])

  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl p-3 shadow-lg border border-[#1F1410]/5">
          <p className="text-sm font-bold text-[#1F1410] mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
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
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Dashboard</h1>
            <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
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
            {incomeLoading ? (
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

          {/* Upcoming RSU Vest */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
            className={`bg-white rounded-2xl p-6 ${cardBorder}`}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4" style={{ color: TAB_COLORS.accounts }} />
              <h3 className="text-sm font-semibold text-[#1F1410]">Upcoming RSU Vest</h3>
            </div>
            {nextVest ? (
              <div className="space-y-3">
                {nextVest.company_name && (
                  <p className="text-xs font-medium text-[#1F1410]/50">{nextVest.company_name}</p>
                )}
                <p className="text-2xl font-light text-[#1F1410]">
                  {formatCurrency(nextVest.total_gross_value)}
                </p>
                <div className="flex items-center justify-between text-xs text-[#1F1410]/50">
                  <span>{nextVest.shares_vested.toLocaleString()} shares @ {formatCurrency(nextVest.vest_price)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#1F1410]/40" />
                  <span className="text-[#1F1410]/60">
                    {new Date(nextVest.vest_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4">
                <TrendingUp className="w-8 h-8 text-[#1F1410]/10 mb-2" />
                <p className="text-sm text-[#1F1410]/40">No upcoming vests</p>
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
                  <span className="text-[#1F1410]/50">vs. Budget</span>
                  <span
                    className="font-semibold"
                    style={{ color: spendingPerDay.projected <= totalBudget ? STATUS_COLORS.success : STATUS_COLORS.error }}
                  >
                    {spendingPerDay.projected <= totalBudget ? 'On track' : `${formatCurrency(spendingPerDay.projected - totalBudget)} over`}
                  </span>
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
                  fill={CHART_COLORS.budget}
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Bar
                  dataKey="spent"
                  name="Actual Spent"
                  fill={CHART_COLORS.spent}
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke={CHART_COLORS.income}
                  strokeWidth={3}
                  dot={{ fill: CHART_COLORS.income, strokeWidth: 2, r: 4 }}
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
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.spent }} />
              <span className="text-xs text-[#1F1410]/60">Actual Spending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.income }} />
              <span className="text-xs text-[#1F1410]/60">Income Trend</span>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
