import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingDown,
  TrendingUp,
  LucideIcon,
  CircleDollarSign,
  CreditCard,
  ListFilter,
  AlertTriangle,
  CheckCircle2,
  Repeat,
} from 'lucide-react'
import { CategoryProgressList } from '../common/CategoryProgressList'
import type { UICategory } from '../../types/category'
import { dbCategoryToUI } from '../../lib/categoryUtils'
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
import { AddTransactionModal, TransactionFormData } from '../modals/AddTransactionModal'

type UITransaction = {
  id: string
  icon: LucideIcon
  merchant: string
  category: string
  category_id: string | null
  goal_id: string | null
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
  const [editingTransaction, setEditingTransaction] = useState<TransactionFormData | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Category lists for the edit modal
  const incomeUiCategories = useMemo<UICategory[]>(() => {
    return dbCategories.filter(c => c.category_type === 'income').map(dbCategoryToUI)
  }, [dbCategories])

  const transferUiCategories = useMemo<UICategory[]>(() => {
    return dbCategories.filter(c => c.category_type === 'transfer').map(dbCategoryToUI)
  }, [dbCategories])

  // Convert DB categories to UI categories with resolved icons
  const uiCategories = useMemo<UICategory[]>(() => {
    return dbCategories
      .filter(c => c.category_type === 'need' || c.category_type === 'want')
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
      goal_id: tx.goal_id || null,
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

  // Expense category IDs (need/want) — used for velocity chart strict filtering
  const expenseCategoryIds = useMemo(() => {
    return new Set(
      dbCategories
        .filter(c => c.category_type === 'need' || c.category_type === 'want')
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
      // Velocity chart: only include categorized expenses (negative amounts with expense category, excluding goal-funded)
      setCurrentMonthVelocityData(
        (data as DBTransaction[]).filter(tx =>
          tx.amount < 0 && tx.category_id && expenseCategoryIds.has(tx.category_id) && !tx.goal_id
        ).map(tx => ({ date: tx.date, amount: tx.amount }))
      )
    }
  }, [mapDBToUI, selectedMonth, excludedCategoryIds])

  // Expected income from shared hook (transaction-based with salary projection)
  const { expectedIncome } = useExpectedIncome(selectedMonth)

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
  const [prevMonthTotal, setPrevMonthTotal] = useState<number>(0)

  const fetchPrevMonthTransactions = useCallback(async () => {
    const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    const { startOfMonth, endOfMonth } = getMonthRange(prevMonth)

    const { data, error } = await supabase
      .from('transactions')
      .select('date, amount, category_id, goal_id')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .lt('amount', 0) // Only expenses (negative amounts)

    if (error) {
      console.error('Error fetching prev month transactions:', error)
    } else if (data) {
      const filtered = data.filter(
        (tx: { date: string; amount: number; category_id: string | null; goal_id: string | null }) =>
          tx.category_id && expenseCategoryIds.has(tx.category_id)
      )
      setPrevMonthTransactions(filtered.map((tx: { date: string; amount: number }) => ({ date: tx.date, amount: tx.amount })))
      // Total for previous month (exclude goal-funded)
      const total = filtered
        .filter((tx: { goal_id: string | null }) => !tx.goal_id)
        .reduce((sum: number, tx: { amount: number }) => sum + Math.abs(tx.amount), 0)
      setPrevMonthTotal(total)
    }
  }, [selectedMonth, expenseCategoryIds])

  // Recurring expense detection: merchants appearing in 2+ of last 3 months with similar amounts
  type RecurringExpense = { merchant: string; amount: number; icon: LucideIcon; color: string; paidThisMonth: boolean }
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])

  const fetchRecurringExpenses = useCallback(async () => {
    // Look at 3 months of data ending at selected month
    const endMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
    const startMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 2, 1)

    const { data, error } = await supabase
      .from('transactions')
      .select('merchant, amount, date, category_id')
      .gte('date', startMonth.toISOString().split('T')[0])
      .lte('date', endMonth.toISOString().split('T')[0])
      .lt('amount', 0)

    if (error) {
      console.error('Error fetching recurring expenses:', error)
      return
    }

    if (!data || data.length === 0) return

    // Group by merchant + approximate amount (within 20%)
    const merchantMonths = new Map<string, { months: Set<string>; amounts: number[]; category_id: string | null }>()
    for (const tx of data) {
      const key = tx.merchant?.toLowerCase()
      if (!key) continue
      const monthKey = tx.date.slice(0, 7)
      const existing = merchantMonths.get(key)
      if (existing) {
        existing.months.add(monthKey)
        existing.amounts.push(Math.abs(tx.amount))
        if (!existing.category_id && tx.category_id) existing.category_id = tx.category_id
      } else {
        merchantMonths.set(key, {
          months: new Set([monthKey]),
          amounts: [Math.abs(tx.amount)],
          category_id: tx.category_id,
        })
      }
    }

    const currentMonthKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`
    const results: RecurringExpense[] = []

    for (const [merchant, info] of merchantMonths) {
      if (info.months.size < 2) continue
      // Check amount consistency: std dev < 30% of mean
      const mean = info.amounts.reduce((a, b) => a + b, 0) / info.amounts.length
      const variance = info.amounts.reduce((sum, a) => sum + (a - mean) ** 2, 0) / info.amounts.length
      if (Math.sqrt(variance) > mean * 0.3) continue

      const cat = info.category_id ? dbCategories.find(c => c.id === info.category_id) : null
      results.push({
        merchant: data.find(tx => tx.merchant?.toLowerCase() === merchant)?.merchant || merchant,
        amount: Math.round(mean * 100) / 100,
        icon: cat ? getIcon(cat.icon) : Repeat,
        color: cat?.color || '#6B7280',
        paidThisMonth: info.months.has(currentMonthKey),
      })
    }

    // Sort: unpaid first, then by amount descending
    results.sort((a, b) => {
      if (a.paidThisMonth !== b.paidThisMonth) return a.paidThisMonth ? 1 : -1
      return b.amount - a.amount
    })

    setRecurringExpenses(results)
  }, [selectedMonth, dbCategories])

  // Current month expense data for velocity chart — stored from raw DB data (before Math.abs)
  const [currentMonthVelocityData, setCurrentMonthVelocityData] = useState<{ date: string; amount: number }[]>([])

  // Refetch categories on mount to sync with any changes made on other pages (e.g., Budget)
  useEffect(() => {
    refetchCategories()
  }, [refetchCategories])

  // Load transactions and budgets when selected month or categories change
  useEffect(() => {
    if (dbCategories.length > 0) {
      fetchTransactions()
      fetchPrevMonthTransactions()
      fetchRecurringExpenses()
    }
    fetchBudgets()
  }, [fetchTransactions, fetchBudgets, fetchPrevMonthTransactions, fetchRecurringExpenses, dbCategories.length, selectedMonth])

  // Calculate month data based on selected month
  const monthData = useMemo(() => {
    return getMonthData(selectedMonth)
  }, [selectedMonth])

  // Categories with budget totals for display (exclude goal-linked transactions from budget tracking)
  const categoriesWithTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions.forEach((t) => {
      if (t.goal_id) return // Goal-funded transactions don't count toward budget
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

  // Filtered transactions for the right column based on selected category
  const filteredTransactions = useMemo(() => {
    if (!selectedCategoryId) return []
    const childIds = getChildCategoryIds(selectedCategoryId)
    const allIds = [selectedCategoryId, ...childIds]
    return transactions.filter(t => t.category_id && allIds.includes(t.category_id))
  }, [selectedCategoryId, transactions, getChildCategoryIds])

  // Get selected category name for display
  const selectedCategoryName = useMemo(() => {
    if (!selectedCategoryId) return ''
    const cat = dbCategories.find(c => c.id === selectedCategoryId)
    return cat?.name || ''
  }, [selectedCategoryId, dbCategories])

  // Handle clicking a transaction to open edit modal
  const handleTransactionClick = useCallback((tx: UITransaction) => {
    const category = uiCategories.find(c => c.id === tx.category_id) || null
    setEditingTransaction({
      id: tx.id,
      merchant: tx.merchant,
      amount: tx.amount,
      date: tx.rawDate,
      category,
      tags: tx.tags,
      notes: tx.notes,
      type: 'expense',
    })
    setIsEditModalOpen(true)
  }, [uiCategories])

  // Handle saving an edited transaction
  const handleSaveTransaction = useCallback(async (transaction: TransactionFormData) => {
    if (!userId) throw new Error('User not authenticated')

    const finalAmount = transaction.type === 'income'
      ? transaction.amount
      : -transaction.amount

    if (transaction.id) {
      const { error } = await supabase
        .from('transactions')
        .update({
          merchant: transaction.merchant,
          amount: finalAmount,
          date: transaction.date,
          category: transaction.category?.name || null,
          category_id: transaction.category?.id || null,
          tags: transaction.tags,
          notes: transaction.notes,
        })
        .eq('id', transaction.id)

      if (error) {
        console.error('Error updating transaction:', error)
        throw new Error('Failed to update transaction')
      }

      // Optimistically update local state
      setTransactions(prev => prev.map(t => {
        if (t.id !== transaction.id) return t
        const cat = transaction.category
          ? dbCategories.find(c => c.id === transaction.category!.id)
          : null
        const icon = cat ? getIcon(cat.icon) : CircleDollarSign
        const color = cat?.color || DEFAULT_COLOR
        return {
          ...t,
          merchant: transaction.merchant,
          amount: transaction.amount,
          rawDate: transaction.date,
          date: formatDisplayDate(transaction.date),
          category: transaction.category?.name || 'Uncategorized',
          category_id: transaction.category?.id || null,
          icon,
          color,
          tags: transaction.tags,
          notes: transaction.notes,
        }
      }))
    }
  }, [userId, dbCategories])

  // Handle deleting a transaction from edit modal
  const handleDeleteTransaction = useCallback(async (transactionId: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)

    if (error) {
      console.error('Error deleting transaction:', error)
      throw new Error('Failed to delete transaction')
    }

    setTransactions(prev => prev.filter(t => t.id !== transactionId))
  }, [])

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

  const overBudgetCategories = useMemo(() => {
    return categoriesWithTotals
      .filter(cat => cat.budget > 0 && cat.total > cat.budget)
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        overage: Math.round((cat.total - cat.budget) * 100) / 100,
      }))
      .sort((a, b) => b.overage - a.overage)
  }, [categoriesWithTotals])

  // Daily spending allowance
  const dailyAllowance = useMemo(() => {
    const remaining = budgetTracking.totalBudget - totalSpent
    if (monthData.daysRemaining <= 0) return 0
    return Math.max(0, remaining / monthData.daysRemaining)
  }, [budgetTracking.totalBudget, totalSpent, monthData.daysRemaining])

  // Spending vs last month
  const vsLastMonth = useMemo(() => {
    const prevMonthName = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
      .toLocaleDateString('en-US', { month: 'long' })
    const diff = totalSpent - prevMonthTotal
    const pctChange = prevMonthTotal > 0 ? (diff / prevMonthTotal) * 100 : 0
    return { diff, pctChange, prevMonthName, prevMonthTotal }
  }, [totalSpent, prevMonthTotal, selectedMonth])

  // Most active category (by transaction count)
  const mostActiveCategory = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of transactions) {
      if (t.goal_id) continue
      counts[t.category] = (counts[t.category] || 0) + 1
    }
    let topName = ''
    let topCount = 0
    for (const [name, count] of Object.entries(counts)) {
      if (count > topCount) { topName = name; topCount = count }
    }
    if (!topName) return null
    const cat = uiCategories.find(c => c.name === topName)
    return {
      name: topName,
      count: topCount,
      icon: cat?.icon || CircleDollarSign,
      color: cat?.color || '#6B7280',
    }
  }, [transactions, uiCategories])

  // Upcoming recurring expenses (not yet paid this month)
  const upcomingRecurring = useMemo(() => {
    return recurringExpenses.filter(r => !r.paidThisMonth)
  }, [recurringExpenses])

  const upcomingRecurringTotal = useMemo(() => {
    return upcomingRecurring.reduce((sum, r) => sum + r.amount, 0)
  }, [upcomingRecurring])

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
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Your Spending</h1>
            <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
          </div>
        </motion.div>

        {/* Stat Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Spent This Month */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-[#1F1410]/5"
          >
            <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/30 mb-2">Spent This Month</p>
            <p className="text-3xl font-light text-[#1F1410]">
              ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-base text-[#1F1410]/40"> of ${budgetTracking.totalBudget.toLocaleString()}</span>
            </p>
          </motion.div>

          {/* Daily Allowance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-[#1F1410]/5"
          >
            <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/30 mb-2">Daily Allowance</p>
            <p className="text-3xl font-light text-[#1F1410]">
              ${Math.round(dailyAllowance).toLocaleString()}
              <span className="text-base text-[#1F1410]/40">/day</span>
            </p>
            <p className="text-xs text-[#1F1410]/40 mt-1">{monthData.daysRemaining} days remaining</p>
          </motion.div>

          {/* Budget Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-[#1F1410]/5"
          >
            <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/30 mb-2">Budget Status</p>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-light" style={{ color: budgetTracking.statusColor }}>
                {Math.round(budgetTracking.percentageOfBudget)}%
              </p>
              {budgetTracking.status === 'under' || budgetTracking.status === 'on-track' ? (
                <TrendingDown className="w-5 h-5" style={{ color: budgetTracking.statusColor }} />
              ) : (
                <TrendingUp className="w-5 h-5" style={{ color: budgetTracking.statusColor }} />
              )}
            </div>
            <p className="text-xs text-[#1F1410]/40 mt-1">{budgetTracking.statusText}</p>
          </motion.div>

          {/* vs Last Month */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-[#1F1410]/5"
          >
            <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/30 mb-2">Vs Last Month</p>
            <p className="text-3xl font-light" style={{ color: vsLastMonth.diff > 0 ? STATUS_COLORS.error : STATUS_COLORS.success }}>
              {vsLastMonth.diff >= 0 ? '+' : '-'}${Math.abs(Math.round(vsLastMonth.diff)).toLocaleString()}
              {vsLastMonth.prevMonthTotal > 0 && (
                <span className="text-base"> ({vsLastMonth.diff >= 0 ? '+' : ''}{Math.round(vsLastMonth.pctChange)}%)</span>
              )}
            </p>
            <p className="text-xs text-[#1F1410]/40 mt-1">vs ${Math.round(vsLastMonth.prevMonthTotal).toLocaleString()} in {vsLastMonth.prevMonthName}</p>
          </motion.div>
        </div>

        {/* Insight Cards + Spending Velocity Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,2fr] gap-4 mb-8 items-stretch">
          {/* Left column: stacked insight cards */}
          <div className="space-y-4">
            {/* Over Budget Insight Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-white rounded-2xl p-5 border border-[#1F1410]/5"
            >
              <div className="flex items-center gap-2 mb-4">
                {overBudgetCategories.length > 0 ? (
                  <AlertTriangle className="w-4 h-4 text-[#FF6B6B]" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                )}
                <span className="text-xs uppercase tracking-widest text-[#1F1410]/30 font-medium">
                  {overBudgetCategories.length > 0 ? 'Over Budget' : 'Budget Health'}
                </span>
              </div>

              {overBudgetCategories.length > 0 ? (
                <div className="space-y-3">
                  {overBudgetCategories.map((cat) => {
                    const CatIcon = cat.icon
                    return (
                      <div key={cat.id} className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${cat.color}15` }}
                        >
                          <CatIcon className="w-4 h-4" style={{ color: cat.color }} />
                        </div>
                        <span className="text-sm font-medium text-[#1F1410] flex-1 truncate">
                          {cat.name}
                        </span>
                        <span className="text-sm font-semibold text-[#FF6B6B] flex-shrink-0">
                          ${cat.overage.toLocaleString()} over
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <p className="text-sm font-medium text-[#1F1410]/60">All categories on track</p>
                </div>
              )}
            </motion.div>

            {/* Most Active Category */}
            {mostActiveCategory && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="bg-white rounded-2xl p-5 border border-[#1F1410]/5"
              >
                <span className="text-xs uppercase tracking-widest text-[#1F1410]/30 font-medium">
                  Most Active
                </span>
                <div className="flex items-center gap-3 mt-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${mostActiveCategory.color}15` }}
                  >
                    <mostActiveCategory.icon className="w-4 h-4" style={{ color: mostActiveCategory.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1F1410] truncate">{mostActiveCategory.name}</p>
                    <p className="text-xs text-[#1F1410]/40">{mostActiveCategory.count} transactions</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Upcoming Recurring */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="bg-white rounded-2xl p-5 border border-[#1F1410]/5"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase tracking-widest text-[#1F1410]/30 font-medium">
                  Upcoming Recurring
                </span>
                {upcomingRecurringTotal > 0 && (
                  <span className="text-xs font-semibold text-[#1F1410]/50">
                    ~${Math.round(upcomingRecurringTotal).toLocaleString()}
                  </span>
                )}
              </div>

              {upcomingRecurring.length > 0 ? (
                <div className="space-y-2.5">
                  {upcomingRecurring.slice(0, 5).map((r) => {
                    const RIcon = r.icon
                    return (
                      <div key={r.merchant} className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${r.color}15` }}
                        >
                          <RIcon className="w-3.5 h-3.5" style={{ color: r.color }} />
                        </div>
                        <span className="text-sm text-[#1F1410] flex-1 truncate">{r.merchant}</span>
                        <span className="text-sm font-medium text-[#1F1410]/60 flex-shrink-0">
                          ~${r.amount.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                  {upcomingRecurring.length > 5 && (
                    <p className="text-xs text-[#1F1410]/30 text-center">
                      +{upcomingRecurring.length - 5} more
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-sm text-[#1F1410]/40">
                    {recurringExpenses.length > 0 ? 'All recurring paid' : 'No recurring detected'}
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Spending Velocity Chart — full height */}
          <div className="h-full">
            <SpendingVelocityChart
              currentMonthTransactions={currentMonthVelocityData}
              previousMonthTransactions={prevMonthTransactions}
              totalBudget={budgetTracking.totalBudget}
              selectedMonth={selectedMonth}
            />
          </div>
        </div>

        {/* Section heading */}
        <h2 className="text-lg font-bold text-[#1F1410] mb-4">Category Budgets</h2>

        {/* Two-column: Category Budgets + Transaction List */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,1fr] gap-6 items-start">
          {/* Left column: Category Budgets */}
          <div>
            <CategoryProgressList
              categories={categoriesWithTotals}
              selectedCategoryId={selectedCategoryId}
              onCategorySelect={setSelectedCategoryId}
            />
          </div>

          {/* Right column: Filtered Transaction List */}
          <div className="lg:sticky lg:top-4 lg:self-start">
            <div className="bg-white rounded-2xl overflow-hidden border border-[#1F1410]/5">
              {selectedCategoryId ? (
                <>
                  <div className="px-5 py-4 border-b border-[#1F1410]/5">
                    <h3 className="text-lg font-bold text-[#1F1410]">{selectedCategoryName}</h3>
                    <p className="text-sm text-[#1F1410]/50">
                      {filteredTransactions.length} {filteredTransactions.length === 1 ? 'transaction' : 'transactions'}
                    </p>
                  </div>
                  <div className="max-h-[calc(100vh-120px)] overflow-y-auto divide-y divide-[#1F1410]/5">
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((tx, i) => {
                        const TxIcon = tx.icon
                        return (
                          <motion.div
                            key={tx.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, duration: 0.2 }}
                            onClick={() => handleTransactionClick(tx)}
                            className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#1F1410]/[0.02] transition-colors"
                          >
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${tx.color}15` }}
                            >
                              <TxIcon className="w-4 h-4" style={{ color: tx.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#1F1410] truncate">{tx.merchant}</p>
                              <div className="flex items-center gap-1.5 text-xs text-[#1F1410]/40">
                                <span>{tx.date}</span>
                                <span>·</span>
                                <div className="flex items-center gap-0.5">
                                  <CreditCard className="w-3 h-3" />
                                  <span>{tx.source}</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-sm font-semibold text-[#1F1410] flex-shrink-0">
                              -${tx.amount.toFixed(2)}
                            </span>
                          </motion.div>
                        )
                      })
                    ) : (
                      <div className="px-5 py-8 text-center">
                        <p className="text-sm text-[#1F1410]/40">No transactions in this category</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="px-5 py-16 text-center">
                  <ListFilter className="w-10 h-10 text-[#1F1410]/15 mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#1F1410]/50">Select a category to view transactions</p>
                  <p className="text-xs text-[#1F1410]/30 mt-1">Click any category on the left</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Transaction Modal */}
        <AddTransactionModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setEditingTransaction(null) }}
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
          categories={uiCategories}
          incomeCategories={incomeUiCategories}
          transferCategories={transferUiCategories}
          editTransaction={editingTransaction}
        />

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
