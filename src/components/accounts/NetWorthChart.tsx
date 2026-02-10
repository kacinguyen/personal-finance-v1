import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { RefreshCw } from 'lucide-react'
import { SHADOWS } from '../../lib/styles'
import { TAB_COLORS } from '../../lib/colors'
import type { NetWorthDataPoint } from '../../types/account'
import { TIME_RANGES, type TimeRange, ChartTooltip, formatCurrency } from '../views/AccountsView'

type NetWorthChartProps = {
  chartData: NetWorthDataPoint[]
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
}

export function NetWorthChart({
  chartData,
  timeRange,
  onTimeRangeChange,
}: NetWorthChartProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-white rounded-2xl p-6 mb-8"
      style={{ boxShadow: SHADOWS.card }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1F1410]">Net Worth</h2>
        <div className="flex items-center gap-1 bg-[#1F1410]/5 rounded-lg p-1">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => onTimeRangeChange(tr.value)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                timeRange === tr.value
                  ? 'bg-white text-[#1F1410] shadow-sm'
                  : 'text-[#1F1410]/50 hover:text-[#1F1410]/70'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length > 1 ? (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={TAB_COLORS.accounts} stopOpacity={0.2} />
                <stop offset="100%" stopColor={TAB_COLORS.accounts} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,20,16,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'rgba(31,20,16,0.4)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'rgba(31,20,16,0.4)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCurrency(v)}
              width={80}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke={TAB_COLORS.accounts}
              strokeWidth={2}
              fill="url(#netWorthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-[280px] text-sm text-[#1F1410]/40">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No chart data yet.</p>
            <p className="text-xs mt-1">
              Click &ldquo;Sync Balances&rdquo; to start tracking your net worth.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  )
}
