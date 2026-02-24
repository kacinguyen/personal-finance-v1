import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

type TransactionData = {
  date: string
  amount: number
}

type Props = {
  currentMonthTransactions: TransactionData[]
  previousMonthTransactions: TransactionData[]
  totalBudget: number
  selectedMonth: Date
}

type DayData = {
  day: number
  current: number | null
  previous: number | null
  budgetPace: number
}

export function SpendingVelocityChart({
  currentMonthTransactions,
  previousMonthTransactions,
  totalBudget,
  selectedMonth,
}: Props) {
  const now = new Date()
  const isCurrentMonth =
    selectedMonth.getFullYear() === now.getFullYear() &&
    selectedMonth.getMonth() === now.getMonth()
  const todayDay = isCurrentMonth ? now.getDate() : null

  const daysInCurrentMonth = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    0,
  ).getDate()

  const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
  const daysInPrevMonth = new Date(
    prevMonth.getFullYear(),
    prevMonth.getMonth() + 1,
    0,
  ).getDate()

  const chartData = useMemo(() => {
    // Build cumulative arrays by day of month
    const currentByDay: number[] = new Array(daysInCurrentMonth).fill(0)
    currentMonthTransactions.forEach(tx => {
      const day = new Date(tx.date + 'T00:00:00').getDate()
      if (day >= 1 && day <= daysInCurrentMonth) {
        currentByDay[day - 1] += Math.abs(tx.amount)
      }
    })

    const prevByDay: number[] = new Array(daysInPrevMonth).fill(0)
    previousMonthTransactions.forEach(tx => {
      const day = new Date(tx.date + 'T00:00:00').getDate()
      if (day >= 1 && day <= daysInPrevMonth) {
        prevByDay[day - 1] += Math.abs(tx.amount)
      }
    })

    // Cumulative sums
    for (let i = 1; i < currentByDay.length; i++) {
      currentByDay[i] += currentByDay[i - 1]
    }
    for (let i = 1; i < prevByDay.length; i++) {
      prevByDay[i] += prevByDay[i - 1]
    }

    const maxDays = Math.max(daysInCurrentMonth, daysInPrevMonth)
    const dailyBudget = totalBudget / daysInCurrentMonth

    const data: DayData[] = []
    for (let d = 1; d <= maxDays; d++) {
      // For current month: only show data up to today (if viewing current month)
      const showCurrent = !isCurrentMonth || d <= (todayDay || daysInCurrentMonth)
      const currentVal = showCurrent && d <= daysInCurrentMonth ? currentByDay[d - 1] : null
      const prevVal = d <= daysInPrevMonth ? prevByDay[d - 1] : null

      data.push({
        day: d,
        current: currentVal !== null && currentVal !== undefined ? Math.round(currentVal * 100) / 100 : null,
        previous: prevVal !== null && prevVal !== undefined ? Math.round(prevVal * 100) / 100 : null,
        budgetPace: Math.round(dailyBudget * d * 100) / 100,
      })
    }

    return data
  }, [currentMonthTransactions, previousMonthTransactions, totalBudget, daysInCurrentMonth, daysInPrevMonth, isCurrentMonth, todayDay])

  const hasData = currentMonthTransactions.length > 0 || previousMonthTransactions.length > 0

  if (!hasData) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="mb-8 bg-white rounded-2xl p-6 border border-[#1F1410]/5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-[#1F1410]/70">Spending Velocity</h3>
        <div className="flex items-center gap-4 text-xs text-[#1F1410]/50">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#FF6B6B] rounded-full inline-block" />
            This month
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#1F1410]/20 rounded-full inline-block" style={{ borderTop: '1px dashed' }} />
            Last month
          </span>
          {totalBudget > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#6366F1]/30 rounded-full inline-block" />
              Budget pace
            </span>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData}>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(31, 20, 16, 0.4)', fontSize: 11 }}
            interval={4}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(31, 20, 16, 0.4)', fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`
            }
          />
          <Tooltip content={<VelocityTooltip />} />

          {/* Budget pace line */}
          {totalBudget > 0 && (
            <Line
              type="linear"
              dataKey="budgetPace"
              stroke="rgba(99, 102, 241, 0.3)"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
              connectNulls
            />
          )}

          {/* Previous month line */}
          <Line
            type="monotone"
            dataKey="previous"
            stroke="rgba(31, 20, 16, 0.2)"
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
            connectNulls
          />

          {/* Current month line */}
          <Line
            type="monotone"
            dataKey="current"
            stroke="#FF6B6B"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#FF6B6B', stroke: '#fff', strokeWidth: 2 }}
            connectNulls
          />

          {/* Today marker */}
          {todayDay && (
            <ReferenceLine
              x={todayDay}
              stroke="rgba(31, 20, 16, 0.15)"
              strokeDasharray="3 3"
              label={{
                value: 'Today',
                position: 'top',
                fill: 'rgba(31, 20, 16, 0.4)',
                fontSize: 10,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

function VelocityTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number | null; color: string }>
  label?: number
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-white rounded-xl p-3 shadow-lg border border-[#1F1410]/5">
      <p className="text-xs font-medium text-[#1F1410]/50 mb-1.5">Day {label}</p>
      {payload.map((entry, index) => {
        if (entry.value === null || entry.value === undefined) return null
        const labels: Record<string, string> = {
          current: 'This month',
          previous: 'Last month',
          budgetPace: 'Budget pace',
        }
        return (
          <p key={index} className="text-sm text-[#1F1410]/70 flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span>{labels[entry.dataKey] || entry.dataKey}:</span>
            <span className="font-semibold text-[#1F1410]">
              ${entry.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </p>
        )
      })}
    </div>
  )
}
