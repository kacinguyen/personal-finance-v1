import { useMemo, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { withOpacity } from '../../lib/colors'
import type { Category } from '../../types/category'

type Props = {
  categories: Category[]
  excludedCategoryIds: Set<string>
}

type MonthCategoryData = {
  categoryId: string
  monthKey: string
  amount: number
}

export function CategorySpendingHeatmap({ categories, excludedCategoryIds }: Props) {
  const [rawData, setRawData] = useState<MonthCategoryData[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch 12 months of expense transactions
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      const now = new Date()
      const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      const startStr = startDate.toISOString().split('T')[0]
      const endStr = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('transactions')
        .select('date, amount, category_id')
        .gte('date', startStr)
        .lte('date', endStr)
        .not('category_id', 'is', null)

      if (error) {
        console.error('Error fetching heatmap data:', error)
        setLoading(false)
        return
      }

      if (data) {
        const grouped: MonthCategoryData[] = []
        const map = new Map<string, number>()

        data.forEach((tx: { date: string; amount: number; category_id: string | null }) => {
          if (!tx.category_id) return
          const d = new Date(tx.date + 'T00:00:00')
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          const key = `${tx.category_id}|${monthKey}`
          map.set(key, (map.get(key) || 0) + Math.abs(tx.amount))
        })

        map.forEach((amount, key) => {
          const [categoryId, monthKey] = key.split('|')
          grouped.push({ categoryId, monthKey, amount })
        })

        setRawData(grouped)
      }
      setLoading(false)
    }

    fetchData()
  }, [])

  // Generate month columns (last 12 months)
  const months = useMemo(() => {
    const result: { key: string; label: string }[] = []
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-US', { month: 'short' })
      result.push({ key, label })
    }
    return result
  }, [])

  // Process data into heatmap grid
  const { rows, isEmpty } = useMemo(() => {
    // Filter to only expense categories (exclude income/transfer)
    const expenseData = rawData.filter(d => !excludedCategoryIds.has(d.categoryId))

    // Sum totals per category
    const categoryTotals = new Map<string, number>()
    expenseData.forEach(d => {
      categoryTotals.set(d.categoryId, (categoryTotals.get(d.categoryId) || 0) + d.amount)
    })

    // Sort by total, take top 10
    const topCategoryIds = [...categoryTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id)

    if (topCategoryIds.length === 0) {
      return { rows: [], isEmpty: true }
    }

    // Build per-category monthly data
    const categoryMonthMap = new Map<string, Map<string, number>>()
    expenseData.forEach(d => {
      if (!topCategoryIds.includes(d.categoryId)) return
      if (!categoryMonthMap.has(d.categoryId)) {
        categoryMonthMap.set(d.categoryId, new Map())
      }
      categoryMonthMap.get(d.categoryId)!.set(d.monthKey, d.amount)
    })

    // Build rows with normalization
    const rows = topCategoryIds.map(catId => {
      const cat = categories.find(c => c.id === catId)
      const monthMap = categoryMonthMap.get(catId) || new Map()
      const maxAmount = Math.max(...Array.from(monthMap.values()), 0)

      const cells = months.map(m => {
        const amount = monthMap.get(m.key) || 0
        const intensity = maxAmount > 0 ? amount / maxAmount : 0
        return { monthKey: m.key, amount, intensity }
      })

      return {
        categoryId: catId,
        name: cat?.name || 'Unknown',
        color: cat?.color || '#6B7280',
        cells,
      }
    })

    return { rows, isEmpty: false }
  }, [rawData, categories, excludedCategoryIds, months])

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="mb-8 bg-white rounded-2xl p-6 shadow-sm"
        style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
      >
        <h3 className="text-sm font-semibold text-[#1F1410]/70 mb-4">Category Spending Heatmap</h3>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#F59E0B] border-t-transparent rounded-full animate-spin" />
        </div>
      </motion.div>
    )
  }

  if (isEmpty) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="mb-8 bg-white rounded-2xl p-6 shadow-sm"
      style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
    >
      <h3 className="text-sm font-semibold text-[#1F1410]/70 mb-4">Category Spending Heatmap</h3>
      <p className="text-xs text-[#1F1410]/40 mb-4">Last 12 months — intensity shows relative spending per category</p>

      <div className="overflow-x-auto -mx-2 px-2">
        {/* Month headers */}
        <div
          className="grid gap-1 mb-1"
          style={{ gridTemplateColumns: `120px repeat(${months.length}, minmax(40px, 1fr))` }}
        >
          <div /> {/* spacer for category label column */}
          {months.map(m => (
            <div key={m.key} className="text-center text-[10px] font-medium text-[#1F1410]/40">
              {m.label}
            </div>
          ))}
        </div>

        {/* Category rows */}
        {rows.map((row) => (
          <div
            key={row.categoryId}
            className="grid gap-1 mb-1"
            style={{ gridTemplateColumns: `120px repeat(${months.length}, minmax(40px, 1fr))` }}
          >
            <div className="text-xs font-medium text-[#1F1410]/70 truncate flex items-center pr-2" title={row.name}>
              {row.name}
            </div>
            {row.cells.map(cell => (
              <div key={cell.monthKey} className="group relative">
                <div
                  className="h-7 rounded-sm transition-transform group-hover:scale-105"
                  style={{
                    backgroundColor: cell.intensity > 0
                      ? withOpacity(row.color, 0.15 + cell.intensity * 0.75)
                      : 'rgba(31, 20, 16, 0.03)',
                  }}
                />
                {/* Hover tooltip */}
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10">
                  <div className="bg-white rounded-lg p-2 shadow-lg border border-[#1F1410]/5 whitespace-nowrap text-xs">
                    <p className="font-medium text-[#1F1410]">
                      ${cell.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </motion.div>
  )
}
