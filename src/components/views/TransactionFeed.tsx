import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  TrendingDown,
  TrendingUp,
  Calendar,
  Wallet,
  LucideIcon,
  CircleDollarSign,
} from 'lucide-react'
import { CategoryProgressList } from '../common/CategoryProgressList'
import type { UICategory } from '../../types/category'
import { dbCategoryToUI } from '../../lib/categoryUtils'
import { CsvDropzone } from '../common/CsvDropzone'
import { importCSVFiles } from '../../lib/csvImport'
import { supabase } from '../../lib/supabase'
import { getIcon, DEFAULT_COLOR } from '../../lib/iconMap'
import { useCategories } from '../../hooks/useCategories'
import { STATUS_COLORS } from '../../lib/colors'
import { SpendingVelocityChart } from '../charts/SpendingVelocityChart'
import { MonthPicker } from '../common/MonthPicker'
import { getMonthRange, getMonthData } from '../../lib/dateUtils'
import { useExpectedIncome } from '../../hooks/useExpectedIncome'
import type { Transaction as DBTransaction } from '../../types/transaction'
import { useUser } from '../../hooks/useUser'

type UITransaction = {
  id: string
  icon: LucideIcon
  merchant: string
  category: string
  category_id: string | null
  date: string
  rawDate: string // ISO date for editing
  amount: number
  color: string
  source: string
  tags: string | null
  notes: string | null
}

/**
 * Format date for display (Today, Yesterday, or MMM DD)
 */
function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00') // Ensure consistent parsing
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const transactionDate = new Date(date)
  transactionDate.setHours(0, 0, 0, 0)

  if (transactionDate.getTime() === today.getTime()) {
    return 'Today'
  } else if (transactionDate.getTime() === yesterday.getTime()) {
    return 'Yesterday'
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

export function TransactionFeed() {
  const { userId } = useUser()
  const { categories: dbCategories, findCategoryByName, refetch: refetchCategories } = useCategories()
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Convert DB categories to UI categories with resolved icons
  const uiCategories = useMemo<UICategory[]>(() => {
    return dbCategories
      .filter(c => c.category_type === 'need' || c.category_type === 'want' || c.category_type === 'savings_funded')
      .map(dbCategoryToUI)
  }, [dbCategories])

  // Map database transaction to UI transaction format using categories from hook
  const mapDBToUI = useCallback((tx: DBTransaction): UITransaction => {
    // Try to find category by ID first, then by name
    let category = tx.category_id
      ? dbCategories.find(c => c.id === tx.category_id)
      : findCategoryByName(tx.category || '')

    const icon = category ? getIcon(category.icon) : CircleDollarSign
    const color = category?.color || DEFAULT_COLOR

    return {
      id: tx.id,
      icon,
      merchant: tx.merchant,
      category: tx.category || 'Uncategorized',
      category_id: tx.category_id || category?.id || null,
      date: formatDisplayDate(tx.date),
      rawDate: tx.date,
      amount: Math.abs(tx.amount), // UI shows positive amounts
      color,
      source: tx.source_name || tx.source,
      tags: tx.tags || null,
      notes: tx.notes || null,
    }
  }, [dbCategories, findCategoryByName])

  // Category IDs to exclude from expenses (income, transfers, credit card payments)
  const excludedCategoryIds = useMemo(() => {
    return new Set(
      dbCategories
        .filter(c => c.category_type === 'income' || c.category_type === 'transfer')
        .map(c => c.id)
    )
  }, [dbCategories])

  // Fetch transactions from Supabase for selected month
  const fetchTransactions = useCallback(async () => {
    const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
    } else if (data) {
      const filtered = (data as DBTransaction[]).filter(
        tx => !tx.category_id || !excludedCategoryIds.has(tx.category_id)
      )
      const uiTransactions = filtered.map(mapDBToUI)
      setTransactions(uiTransactions)
    }
  }, [mapDBToUI, selectedMonth, excludedCategoryIds])

  // Expected income from shared hook (transaction-based with salary projection)
  const { expectedIncome, isProjected: usingHistoricalIncome } = useExpectedIncome(selectedMonth)

  // Fetch budgets from database
  const fetchBudgets = useCallback(async () => {
    const { data, error } = await supabase
      .from('budgets')
      .select('category, category_id, monthly_limit')
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching budgets:', error)
    } else if (data) {
      // Create a map of category_id/name to budget amount
      const budgetMap: Record<string, number> = {}
      data.forEach((b) => {
        // Store by category_id if available, otherwise by name
        if (b.category_id) {
          budgetMap[b.category_id] = Number(b.monthly_limit)
        }
        // Also store by name for fallback matching
        budgetMap[b.category] = Number(b.monthly_limit)
      })
      setBudgets(budgetMap)
    }
  }, [])

  // Previous month expense transactions (for spending velocity chart)
  const [prevMonthTransactions, setPrevMonthTransactions] = useState<{ date: string; amount: number }[]>([])

  const fetchPrevMonthTransactions = useCallback(async () => {
    const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    const { startOfMonth, endOfMonth } = getMonthRange(prevMonth)

    const { data, error } = await supabase
      .from('transactions')
      .select('date, amount, category_id')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)

    if (error) {
      console.error('Error fetching prev month transactions:', error)
    } else if (data) {
      const filtered = data.filter(
        (tx: { date: string; amount: number; category_id: string | null }) =>
          !tx.category_id || !excludedCategoryIds.has(tx.category_id)
      )
      setPrevMonthTransactions(filtered.map((tx: { date: string; amount: number }) => ({ date: tx.date, amount: tx.amount })))
    }
  }, [selectedMonth, excludedCategoryIds])

  // Current month transaction data for velocity chart (lightweight: just date + amount)
  const currentMonthVelocityData = useMemo(() => {
    return transactions.map(t => ({ date: t.rawDate, amount: t.amount }))
  }, [transactions])

  // Refetch categories on mount to sync with any changes made on other pages (e.g., Budget)
  useEffect(() => {
    refetchCategories()
  }, [refetchCategories])

  // Load transactions and budgets when selected month or categories change
  useEffect(() => {
    if (dbCategories.length > 0) {
      fetchTransactions()
      fetchPrevMonthTransactions()
    }
    fetchBudgets()
  }, [fetchTransactions, fetchBudgets, fetchPrevMonthTransactions, dbCategories.length, selectedMonth])

  // Calculate month data based on selected month
  const monthData = useMemo(() => {
    return getMonthData(selectedMonth)
  }, [selectedMonth])

  // Categories with budget totals for display
  const categoriesWithTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount
    })

    return uiCategories.map((cat) => ({
      ...cat,
      total: Math.round((totals[cat.name] || 0) * 100) / 100,
      // Look up budget by category ID first, then by name
      budget: budgets[cat.id] || budgets[cat.name] || 0,
    }))
  }, [uiCategories, transactions, budgets])

  // Helper to get child category IDs for a parent category
  const getChildCategoryIds = useCallback((parentId: string): string[] => {
    return dbCategories
      .filter(c => c.parent_id === parentId)
      .map(c => c.id)
  }, [dbCategories])

  const totalSpent = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  )

  const budgetTracking = useMemo(() => {
    const totalBudget = categoriesWithTotals.reduce((sum, cat) => sum + cat.budget, 0)
    const expectedSpending = totalBudget > 0 ? (totalBudget * monthData.daysElapsed) / monthData.daysInMonth : 0
    const difference = totalSpent - expectedSpending
    const percentageOfBudget = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    const remainingIncome = expectedIncome - totalSpent
    const percentageOfIncome = expectedIncome > 0 ? (totalSpent / expectedIncome) * 100 : 0

    let status: 'neutral' | 'under' | 'on-track' | 'trending-over' | 'over'
    let statusColor: string
    let statusText: string
    let statusDescription: string

    if (totalBudget === 0 || monthData.daysElapsed === 0) {
      status = 'neutral'
      statusColor = STATUS_COLORS.warning
      statusText = totalBudget === 0 ? 'No budget set' : 'Month hasn\'t started'
      statusDescription = totalBudget === 0 ? 'Set a budget to track spending' : ''
    } else if (totalSpent > totalBudget) {
      status = 'over'
      statusColor = STATUS_COLORS.error
      statusText = 'Over Budget'
      statusDescription = `Exceeded budget by $${Math.round(totalSpent - totalBudget).toLocaleString()}`
    } else if (difference > totalBudget * 0.1) {
      status = 'trending-over'
      statusColor = STATUS_COLORS.warning
      statusText = 'Trending Over'
      statusDescription = `Spending pace is $${Math.round(difference).toLocaleString()} ahead`
    } else if (difference < -totalBudget * 0.1) {
      status = 'under'
      statusColor = STATUS_COLORS.success
      statusText = 'Under Budget'
      statusDescription = `Spending pace is $${Math.round(Math.abs(difference)).toLocaleString()} behind`
    } else {
      status = 'on-track'
      statusColor = STATUS_COLORS.success
      statusText = 'On Track'
      statusDescription = 'Spending is within expected range'
    }

    return {
      totalBudget,
      expectedSpending,
      difference,
      percentageOfBudget,
      remainingIncome,
      percentageOfIncome,
      status,
      statusColor,
      statusText,
      statusDescription,
    }
  }, [categoriesWithTotals, totalSpent, monthData, expectedIncome])

  const handleCsvImport = async (files: File[]) => {
    if (!userId) {
      console.error('User not authenticated')
      return
    }
    const count = await importCSVFiles(files, userId)
    console.log(`Imported ${count} transactions`)
    await fetchTransactions()
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-[#F59E0B]" />
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Your Spending</h1>
            </div>
            <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
          </div>
          <p className="text-[#1F1410]/60 text-lg">
            <span className="font-semibold text-[#1F1410]">
              ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>{' '}
            spent {monthData.isCurrentMonth ? 'so far' : 'total'}
          </p>
        </motion.div>

        {/* Budget Tracking Insight */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-8 bg-white rounded-2xl p-6 shadow-sm"
          style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-4">
            {/* Days Remaining */}
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
                className="w-12 h-12 rounded-xl bg-[#1F1410]/5 flex items-center justify-center flex-shrink-0"
              >
                <Calendar className="w-6 h-6 text-[#1F1410]/60" />
              </motion.div>
              <div>
                <p className="text-2xl font-bold text-[#1F1410]">{monthData.daysRemaining} days</p>
                <p className="text-sm text-[#1F1410]/50">left in {monthData.monthName}</p>
              </div>
            </div>

            {/* Expected Income */}
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.35 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: '#10B98115' }}
              >
                <Wallet className="w-6 h-6 text-[#10B981]" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-[#1F1410]">${expectedIncome.toLocaleString()}</p>
                  {usingHistoricalIncome && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
                      Based on recent data
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#1F1410]/50">expected income</p>
              </div>
            </div>

            {/* Budget Status */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-[#1F1410]/50 mb-1">Budget Status</p>
                <div className="flex items-center gap-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.4 }}
                  >
                    {budgetTracking.status === 'under' || budgetTracking.status === 'on-track' ? (
                      <TrendingDown className="w-5 h-5" style={{ color: budgetTracking.statusColor }} />
                    ) : (
                      <TrendingUp className="w-5 h-5" style={{ color: budgetTracking.statusColor }} />
                    )}
                  </motion.div>
                  <span className="font-semibold text-lg" style={{ color: budgetTracking.statusColor }}>
                    {budgetTracking.statusText}
                  </span>
                </div>
                {budgetTracking.statusDescription && (
                  <p className="text-xs text-[#1F1410]/40 mt-0.5">{budgetTracking.statusDescription}</p>
                )}
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.45 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${budgetTracking.statusColor}15` }}
              >
                <span className="text-sm font-bold" style={{ color: budgetTracking.statusColor }}>
                  {Math.round(budgetTracking.percentageOfBudget)}%
                </span>
              </motion.div>
            </div>
          </div>

          {/* Spent vs Budget Progress */}
          {budgetTracking.status !== 'neutral' && (
            <div className="mt-5 pt-5 border-t border-[#1F1410]/5">
              <div className="flex justify-between text-sm text-[#1F1410]/60 mb-2">
                <span>Spent vs Budget</span>
                <span className="font-semibold text-[#1F1410]">
                  ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} of ${budgetTracking.totalBudget.toLocaleString()}
                </span>
              </div>
              <div className="h-2.5 bg-[#1F1410]/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(budgetTracking.percentageOfBudget, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: budgetTracking.statusColor }}
                />
              </div>
              <p className="text-xs text-[#1F1410]/40 mt-2">
                Day {monthData.daysElapsed} of {monthData.daysInMonth} — expected ~${Math.round(budgetTracking.expectedSpending).toLocaleString()} spent by now
              </p>
            </div>
          )}

          {/* Income Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-[#1F1410]/40 mb-2">
              <span>
                ${budgetTracking.remainingIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                remaining from income
              </span>
              <span>{Math.round(budgetTracking.percentageOfIncome)}% of income spent</span>
            </div>
            <div className="h-2 bg-[#1F1410]/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(budgetTracking.percentageOfIncome, 100)}%` }}
                transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ backgroundColor: budgetTracking.remainingIncome > 0 ? STATUS_COLORS.success : STATUS_COLORS.error }}
              />
            </div>
          </div>
        </motion.div>

        {/* Spending Velocity Chart */}
        <SpendingVelocityChart
          currentMonthTransactions={currentMonthVelocityData}
          previousMonthTransactions={prevMonthTransactions}
          totalBudget={budgetTracking.totalBudget}
          selectedMonth={selectedMonth}
        />

        {/* Category Budgets with inline transactions */}
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-bold text-[#1F1410]">Category Budgets</h2>
            <CsvDropzone onFilesAdded={handleCsvImport} />
          </div>
          <CategoryProgressList
            categories={categoriesWithTotals}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={setSelectedCategoryId}
            transactions={transactions}
            childCategoryIds={getChildCategoryIds}
          />
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="text-center text-[#1F1410]/40 text-sm mt-8"
        >
          Keep up the great work!
        </motion.p>
      </div>
    </div>
  )
}
