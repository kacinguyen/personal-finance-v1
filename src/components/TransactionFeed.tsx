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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { CategoryProgressList } from './CategoryProgressList'
import { TransactionItem } from './TransactionItem'
import { UICategory, dbCategoryToUI } from './CategoryDropdown'
import { CsvDropzone } from './CsvDropzone'
import { importCSVFiles } from '../lib/csvImport'
import { supabase } from '../lib/supabase'
import { getIcon, DEFAULT_COLOR } from '../lib/iconMap'
import { useCategories } from '../hooks/useCategories'
import type { Transaction as DBTransaction } from '../types/transaction'
import { useUser } from '../hooks/useUser'

type UITransaction = {
  id: string
  icon: LucideIcon
  merchant: string
  category: string
  category_id: string | null
  date: string
  amount: number
  color: string
  source: string
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
  const ITEMS_PER_PAGE = 20

  const { userId } = useUser()
  const { categories: dbCategories, createCategory, findCategoryByName } = useCategories()
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [expectedIncome, setExpectedIncome] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [budgets, setBudgets] = useState<Record<string, number>>({})

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
      date: formatDisplayDate(tx.date),
      amount: Math.abs(tx.amount), // UI shows positive amounts
      color,
      source: tx.source_name || tx.source,
    }
  }, [dbCategories, findCategoryByName])

  // Fetch transactions from Supabase
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching transactions:', error)
    } else if (data) {
      const uiTransactions = (data as DBTransaction[]).map(mapDBToUI)
      setTransactions(uiTransactions)
    }
    setLoading(false)
  }, [mapDBToUI])

  // Fetch expected income from paystubs
  const fetchExpectedIncome = useCallback(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('paystubs')
      .select('net_pay')
      .gte('pay_date', startOfMonth)
      .lte('pay_date', endOfMonth)

    if (error) {
      console.error('Error fetching paystubs:', error)
    } else if (data) {
      const totalIncome = data.reduce((sum, p) => sum + Number(p.net_pay), 0)
      setExpectedIncome(totalIncome)
    }
  }, [])

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

  // Load transactions, expected income, and budgets on mount or when categories change
  useEffect(() => {
    if (dbCategories.length > 0) {
      fetchTransactions()
    }
    fetchExpectedIncome()
    fetchBudgets()
  }, [fetchTransactions, fetchExpectedIncome, fetchBudgets, dbCategories.length])

  const monthData = useMemo(() => {
    const now = new Date()
    const currentDay = now.getDate()
    const year = now.getFullYear()
    const month = now.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysRemaining = daysInMonth - currentDay
    const daysElapsed = currentDay
    const monthName = now.toLocaleDateString('en-US', { month: 'long' })
    return { currentDay, daysInMonth, daysRemaining, daysElapsed, monthName }
  }, [])

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

  const totalSpent = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  )

  // Pagination
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE)
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return transactions.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [transactions, currentPage])

  // Reset to page 1 when transactions change (e.g., after import)
  useEffect(() => {
    setCurrentPage(1)
  }, [transactions.length])

  const budgetTracking = useMemo(() => {
    const totalBudget = categoriesWithTotals.reduce((sum, cat) => sum + cat.budget, 0)
    const expectedSpending = totalBudget > 0 ? (totalBudget * monthData.daysElapsed) / monthData.daysInMonth : 0
    const difference = totalSpent - expectedSpending
    const percentageOfBudget = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
    const remainingIncome = expectedIncome - totalSpent
    const percentageOfIncome = expectedIncome > 0 ? (totalSpent / expectedIncome) * 100 : 0

    let status: 'under' | 'on-track' | 'over'
    let statusColor: string
    let statusText: string

    if (totalBudget === 0) {
      status = 'on-track'
      statusColor = '#F59E0B'
      statusText = 'No budget set'
    } else if (difference < -totalBudget * 0.1) {
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
      percentageOfBudget,
      remainingIncome,
      percentageOfIncome,
      status,
      statusColor,
      statusText,
    }
  }, [categoriesWithTotals, totalSpent, monthData, expectedIncome])

  const handleCategoryChange = async (transactionId: string, category: UICategory) => {
    // Update local state immediately
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId
          ? { ...t, category: category.name, category_id: category.id, icon: category.icon, color: category.color }
          : t
      )
    )

    // Update in database
    const { error } = await supabase
      .from('transactions')
      .update({
        category: category.name,
        category_id: category.id,
      })
      .eq('id', transactionId)

    if (error) {
      console.error('Error updating transaction category:', error)
    }
  }

  const handleCreateCategory = async (data: { name: string; icon: string; color: string }) => {
    const newCategory = await createCategory({
      name: data.name,
      icon: data.icon,
      color: data.color,
      category_type: 'want', // Default new categories to 'want'
      is_system: false,
      is_active: true,
    })

    if (newCategory) {
      return dbCategoryToUI(newCategory)
    }
    return null
  }

  const handleCsvImport = async (files: File[]) => {
    if (!userId) {
      console.error('User not authenticated')
      return
    }
    const count = await importCSVFiles(files, userId)
    console.log(`Imported ${count} transactions`)
    // Refresh transactions from Supabase after import
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
          <div className="flex items-center gap-3 mb-2">
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
              <Sparkles className="w-8 h-8 text-[#F59E0B]" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Your Spending</h1>
          </div>
          <p className="text-[#1F1410]/60 text-lg">
            {monthData.monthName} {new Date().getFullYear()} •{' '}
            <span className="font-semibold text-[#1F1410]">
              ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>{' '}
            spent so far
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
                <p className="text-2xl font-bold text-[#1F1410]">${expectedIncome.toLocaleString()}</p>
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
                    {budgetTracking.status === 'under' ? (
                      <TrendingDown className="w-5 h-5" style={{ color: budgetTracking.statusColor }} />
                    ) : (
                      <TrendingUp className="w-5 h-5" style={{ color: budgetTracking.statusColor }} />
                    )}
                  </motion.div>
                  <span className="font-semibold text-lg" style={{ color: budgetTracking.statusColor }}>
                    {budgetTracking.statusText}
                  </span>
                </div>
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

          {/* Progress Bar */}
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
                style={{ backgroundColor: budgetTracking.remainingIncome > 0 ? '#10B981' : '#FF6B6B' }}
              />
            </div>
          </div>
        </motion.div>

        {/* Category Budgets Progress List */}
        <CategoryProgressList categories={categoriesWithTotals} />

        {/* Transactions Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.4 }}>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-bold text-[#1F1410]">Recent Transactions</h2>
            <CsvDropzone onFilesAdded={handleCsvImport} />
          </div>
          <div
            className="bg-white rounded-2xl shadow-sm overflow-hidden"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            {loading ? (
              <div className="p-8 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-[#F59E0B] border-t-transparent rounded-full mx-auto mb-3"
                />
                <p className="text-[#1F1410]/50">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-8 text-center">
                <CircleDollarSign className="w-12 h-12 text-[#1F1410]/20 mx-auto mb-3" />
                <p className="text-[#1F1410]/50 mb-2">No transactions yet</p>
                <p className="text-sm text-[#1F1410]/40">Import a CSV to get started</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-[#1F1410]/5">
                  {paginatedTransactions.map((transaction, index) => (
                    <TransactionItem
                      key={transaction.id}
                      id={transaction.id}
                      icon={transaction.icon}
                      merchant={transaction.merchant}
                      category={transaction.category}
                      date={transaction.date}
                      amount={transaction.amount}
                      color={transaction.color}
                      source={transaction.source}
                      index={index}
                      categories={uiCategories}
                      onCategoryChange={handleCategoryChange}
                      onCreateCategory={handleCreateCategory}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-[#1F1410]/5">
                    <p className="text-sm text-[#1F1410]/50">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                      {Math.min(currentPage * ITEMS_PER_PAGE, transactions.length)} of {transactions.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1F1410]/5"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </button>
                      <span className="text-sm text-[#1F1410]/60 px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1F1410]/5"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>

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
