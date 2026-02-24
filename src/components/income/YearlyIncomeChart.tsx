import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import type { PaystubRecord } from '../views/IncomeView'

interface Props {
  paystubs: PaystubRecord[]
  selectedMonth: Date
}

const SOURCES = {
  salary: { label: 'Salary (Net)', color: '#10B981' },
  bonus: { label: 'Bonus', color: '#F59E0B' },
  retirement: { label: '401(k)', color: '#6366F1' },
  employer_match: { label: 'Employer Match', color: '#8B5CF6' },
  espp: { label: 'ESPP', color: '#14B8A6' },
  hsa: { label: 'HSA', color: '#EC4899' },
} as const

type SourceKey = keyof typeof SOURCES
const SOURCE_KEYS = Object.keys(SOURCES) as SourceKey[]

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Flat chart data shape — recharts needs flat keys for stacked bars
type ChartRow = {
  month: string
  monthIndex: number
  isForecast: boolean
  lastYear: number
  forecast: number | null
  // Flattened current-year source values (cur_salary, cur_bonus, etc.)
  [key: `cur_${string}`]: number
  // Keep full breakdowns for the tooltip
  currentBySource: Record<SourceKey, number>
  lastYearBySource: Record<SourceKey, number>
}

function extractSources(stubs: PaystubRecord[]): Record<SourceKey, number> {
  const out: Record<SourceKey, number> = {
    salary: 0, bonus: 0, retirement: 0, employer_match: 0, espp: 0, hsa: 0,
  }
  for (const p of stubs) {
    out.salary += Number(p.net_pay) || 0
    out.bonus += Number(p.bonus_pay) || 0
    out.retirement += (Number(p.traditional_401k) || 0) + (Number(p.roth_401k) || 0) + (Number(p.after_tax_401k) || 0)
    out.employer_match += Number(p.employer_401k_match) || 0
    out.espp += Number(p.espp_contribution) || 0
    out.hsa += Number(p.hsa_contribution) || 0
  }
  return out
}

function filteredTotal(bySource: Record<SourceKey, number>, filters: Set<SourceKey>): number {
  return SOURCE_KEYS.filter(k => filters.has(k)).reduce((s, k) => s + bySource[k], 0)
}

export function YearlyIncomeChart({ paystubs, selectedMonth }: Props) {
  const [activeFilters, setActiveFilters] = useState<Set<SourceKey>>(
    () => new Set(SOURCE_KEYS)
  )

  const toggleFilter = (key: SourceKey) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size > 1) next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const year = selectedMonth.getFullYear()
  const lastYearVal = year - 1

  const { chartData } = useMemo(() => {
    const now = new Date()

    const groupByMonth = (targetYear: number) => {
      const monthly = new Map<number, PaystubRecord[]>()
      for (const p of paystubs) {
        const d = new Date(p.pay_date)
        if (d.getFullYear() === targetYear) {
          const m = d.getMonth()
          if (!monthly.has(m)) monthly.set(m, [])
          monthly.get(m)!.push(p)
        }
      }
      return monthly
    }

    const currentYearData = groupByMonth(year)
    const lastYearData = groupByMonth(lastYearVal)

    let ytd = 0
    let lastYtd = 0
    let monthsWithData = 0

    // First pass — build rows with actual data
    const rows: ChartRow[] = []
    const actualSourceTotals: Record<SourceKey, number> = {
      salary: 0, bonus: 0, retirement: 0, employer_match: 0, espp: 0, hsa: 0,
    }

    for (let m = 0; m < 12; m++) {
      const curStubs = currentYearData.get(m) || []
      const lastStubs = lastYearData.get(m) || []

      const curSources = extractSources(curStubs)
      const lastSources = extractSources(lastStubs)

      const hasCurData = curStubs.length > 0
      const isForecast = !hasCurData && (year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth()))

      const curTotal = filteredTotal(curSources, activeFilters)
      const lastTotal = filteredTotal(lastSources, activeFilters)

      if (hasCurData) {
        ytd += curTotal
        monthsWithData++
        for (const k of SOURCE_KEYS) actualSourceTotals[k] += curSources[k]
      }
      lastYtd += lastTotal

      // Build flat row
      const row: any = {
        month: MONTH_NAMES[m],
        monthIndex: m,
        isForecast,
        lastYear: lastTotal,
        forecast: null,
        currentBySource: curSources,
        lastYearBySource: lastSources,
      }
      // Flatten per-source values for stacked bars
      for (const k of SOURCE_KEYS) {
        row[`cur_${k}`] = activeFilters.has(k) ? curSources[k] : 0
      }

      rows.push(row as ChartRow)
    }

    // Compute per-source averages for forecast
    const sourceAvgs: Record<SourceKey, number> = { ...actualSourceTotals }
    if (monthsWithData > 0) {
      for (const k of SOURCE_KEYS) sourceAvgs[k] = Math.round((sourceAvgs[k] / monthsWithData) * 100) / 100
    }

    // Fill forecast months
    for (const row of rows) {
      if (row.isForecast && monthsWithData > 0) {
        for (const k of SOURCE_KEYS) {
          (row as any)[`cur_${k}`] = activeFilters.has(k) ? sourceAvgs[k] : 0
          row.currentBySource[k] = sourceAvgs[k]
        }
      }
    }

    // Build forecast line (last actual → forecast months)
    let lastActualIdx = -1
    for (let i = rows.length - 1; i >= 0; i--) {
      if (!rows[i].isForecast && filteredTotal(rows[i].currentBySource, activeFilters) > 0) {
        lastActualIdx = i
        break
      }
    }
    for (let i = 0; i < rows.length; i++) {
      if (i === lastActualIdx || rows[i].isForecast) {
        rows[i].forecast = SOURCE_KEYS
          .filter(k => activeFilters.has(k))
          .reduce((s, k) => s + rows[i].currentBySource[k], 0)
      }
    }

    return { chartData: rows, ytdTotal: ytd, lastYearTotal: lastYtd }
  }, [paystubs, selectedMonth, activeFilters, year, lastYearVal])

  if (paystubs.length === 0) return null

  // Ordered list of active source keys (for top-radius on the topmost bar)
  const activeSourceKeys = SOURCE_KEYS.filter(k => activeFilters.has(k))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="bg-white rounded-2xl p-6 mb-6 border border-[#1F1410]/5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-[#1F1410]/70">
            {year} Income
          </h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-[#1F1410]/50 mt-1 flex-wrap justify-end">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'linear-gradient(to top, #10B981 40%, #6366F1 40%, #6366F1 70%, #F59E0B 70%)' }} />
            {year}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: 'rgba(31, 20, 16, 0.15)' }} />
            {lastYearVal}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 inline-block" style={{ borderTop: '2px dashed rgba(31, 20, 16, 0.25)' }} />
            Forecast
          </span>
        </div>
      </div>

      {/* Filter toggles */}
      <div className="flex flex-wrap gap-2 mt-4 mb-4">
        {(Object.entries(SOURCES) as [SourceKey, typeof SOURCES[SourceKey]][]).map(([key, source]) => {
          const isActive = activeFilters.has(key)
          return (
            <button
              key={key}
              onClick={() => toggleFilter(key)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
              style={{
                backgroundColor: isActive ? `${source.color}15` : 'rgba(31, 20, 16, 0.04)',
                color: isActive ? source.color : 'rgba(31, 20, 16, 0.3)',
                border: `1px solid ${isActive ? `${source.color}30` : 'transparent'}`,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isActive ? source.color : 'rgba(31, 20, 16, 0.15)' }}
              />
              {source.label}
            </button>
          )
        })}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={chartData} barCategoryGap="20%" barGap={2}>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(31, 20, 16, 0.4)', fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'rgba(31, 20, 16, 0.4)', fontSize: 11 }}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `$${v}`
            }
            width={55}
          />
          <Tooltip content={<IncomeTooltip activeFilters={activeFilters} year={year} lastYear={lastYearVal} />} />

          {/* Stacked source bars for current period */}
          {activeSourceKeys.map((key, idx) => {
            const isTop = idx === activeSourceKeys.length - 1
            return (
              <Bar
                key={key}
                dataKey={`cur_${key}`}
                stackId="current"
                fill={SOURCES[key].color}
                radius={isTop ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={32}
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fillOpacity={entry.isForecast ? 0.4 : 1}
                  />
                ))}
              </Bar>
            )
          })}

          {/* Last period bar (single gray) */}
          <Bar dataKey="lastYear" fill="rgba(31, 20, 16, 0.15)" radius={[3, 3, 0, 0]} maxBarSize={32} />

          {/* Forecast dashed line */}
          <Line
            type="monotone"
            dataKey="forecast"
            stroke="rgba(31, 20, 16, 0.25)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            connectNulls
            isAnimationActive={false}
          />

          {/* Current month marker */}
          <ReferenceLine
            x={new Date().toLocaleString('en-US', { month: 'short' })}
            stroke="rgba(31, 20, 16, 0.1)"
            strokeDasharray="3 3"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

function IncomeTooltip({
  active,
  payload,
  label,
  activeFilters,
  year,
  lastYear,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number | null; payload?: ChartRow }>
  label?: string
  activeFilters: Set<SourceKey>
  year: number
  lastYear: number
}) {
  if (!active || !payload || payload.length === 0) return null

  const rawData = payload[0]?.payload
  if (!rawData) return null

  const isForecast = rawData.isForecast

  const currentTotal = filteredTotal(rawData.currentBySource, activeFilters)
  const lastYearTotal = filteredTotal(rawData.lastYearBySource, activeFilters)

  const fmtNum = (v: number) =>
    '$' + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="bg-white rounded-xl p-3 shadow-lg border border-[#1F1410]/5 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-medium text-[#1F1410]/50">{label}</p>
        {isForecast && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1F1410]/5 text-[#1F1410]/40">
            Forecast
          </span>
        )}
      </div>

      {/* Current period total */}
      <div className="flex justify-between items-center mb-1">
        <span className="flex items-center gap-1.5 text-sm text-[#1F1410]/70">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: '#10B981', opacity: isForecast ? 0.4 : 1 }} />
          {year}
        </span>
        <span className="font-bold text-sm text-[#1F1410]">
          {fmtNum(currentTotal)}
        </span>
      </div>

      {/* Last period total */}
      <div className="flex justify-between items-center mb-2">
        <span className="flex items-center gap-1.5 text-sm text-[#1F1410]/70">
          <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: 'rgba(31, 20, 16, 0.15)' }} />
          {lastYear}
        </span>
        <span className="font-semibold text-sm text-[#1F1410]/60">
          {fmtNum(lastYearTotal)}
        </span>
      </div>

      {/* Per-source breakdown for current year */}
      {!isForecast && (
        <div className="border-t border-[#1F1410]/5 pt-1.5 mt-1.5 space-y-0.5">
          {(Object.entries(SOURCES) as [SourceKey, typeof SOURCES[SourceKey]][])
            .filter(([key]) => activeFilters.has(key) && (rawData.currentBySource?.[key] || 0) > 0)
            .map(([key, source]) => (
              <div key={key} className="flex justify-between text-xs text-[#1F1410]/60">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: source.color }} />
                  {source.label}
                </span>
                <span className="font-medium text-[#1F1410]/80">{fmtNum(rawData.currentBySource[key])}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
