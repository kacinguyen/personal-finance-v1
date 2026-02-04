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
  Plus,
} from 'lucide-react'
import { CategoryProgressList } from './CategoryProgressList'
import { TransactionItem } from './TransactionItem'
import { UICategory, dbCategoryToUI } from './CategoryDropdown'
import { CsvDropzone } from './CsvDropzone'
import { AddTransactionModal, TransactionFormData } from './AddTransactionModal'
import { importCSVFiles } from '../lib/csvImport'
import { supabase } from '../lib/supabase'
import { getIcon, DEFAULT_COLOR } from '../lib/iconMap'
import { useCategories } from '../hooks/useCategories'
import { MonthPicker, getMonthRange, getMonthData } from './MonthPicker'
import type { Transaction as DBTransaction } from '../types/transaction'
import { useUser } from '../hooks/useUser'

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
  const ITEMS_PER_PAGE = 20

  const { userId } = useUser()
  const { categories: dbCategories, findCategoryByName, refetch: refetchCategories } = useCategories()
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [budgets, setBudgets] = useState<Record<string, number>>({})
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionFormData | null>(null)

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
      rawDate: tx.date,
      amount: Math.abs(tx.amount), // UI shows positive amounts
      color,
      source: tx.source_name || tx.source,
      tags: tx.tags || null,
      notes: tx.notes || null,
    }
  }, [dbCategories, findCategoryByName])

  // Fetch transactions from Supabase for selected month
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
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
      const uiTransactions = (data as DBTransaction[]).map(mapDBToUI)
      setTransactions(uiTransactions)
    }
    setLoading(false)
  }, [mapDBToUI, selectedMonth])

  // Paystubs for expected income calculation
  const [allPaystubs, setAllPaystubs] = useState<{ pay_date: string; net_pay: number }[]>([])

  // Fetch all paystubs (we'll filter by month client-side for fallback logic)
  const fetchExpectedIncome = useCallback(async () => {
    const { data, error } = await supabase
      .from('paystubs')
      .select('pay_date, net_pay')
      .order('pay_date', { ascending: false })

    if (error) {
      console.error('Error fetching paystubs:', error)
    } else if (data) {
      setAllPaystubs(data)
    }
  }, [])

  // Calculate expected income with fallback to most recent month (matches Income page logic)
  const { expectedIncome, usingHistoricalIncome } = useMemo(() => {
    // Filter paystubs for selected month
    const selectedMonthPaystubs = allPaystubs.filter((p) => {
      const payDate = new Date(p.pay_date)
      return payDate.getMonth() === selectedMonth.getMonth() && payDate.getFullYear() === selectedMonth.getFullYear()
    })

    // If selected month has data, use it
    if (selectedMonthPaystubs.length > 0) {
      return {
        expectedIncome: selectedMonthPaystubs.reduce((sum, p) => sum + Number(p.net_pay), 0),
        usingHistoricalIncome: false,
      }
    }

    // No selected month data - group by month and use most recent
    if (allPaystubs.length > 0) {
      const paysByMonth: Record<string, number> = {}
      allPaystubs.forEach((p) => {
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
        return {
          expectedIncome: paysByMonth[sortedMonths[0]],
          usingHistoricalIncome: true,
        }
      }
    }

    return { expectedIncome: 0, usingHistoricalIncome: false }
  }, [allPaystubs, selectedMonth])

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

  // Refetch categories on mount to sync with any changes made on other pages (e.g., Budget)
  useEffect(() => {
    refetchCategories()
  }, [refetchCategories])

  // Load transactions, expected income, and budgets when selected month or categories change
  useEffect(() => {
    if (dbCategories.length > 0) {
      fetchTransactions()
    }
    fetchExpectedIncome()
    fetchBudgets()
  }, [fetchTransactions, fetchExpectedIncome, fetchBudgets, dbCategories.length, selectedMonth])

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

  const handleSaveTransaction = async (transaction: TransactionFormData) => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    if (transaction.id) {
      // Update existing transaction
      const { error } = await supabase
        .from('transactions')
        .update({
          merchant: transaction.merchant,
          amount: -transaction.amount, // Store as negative for expenses
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
    } else {
      // Insert new transaction
      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        merchant: transaction.merchant,
        amount: -transaction.amount, // Store as negative for expenses
        date: transaction.date,
        category: transaction.category?.name || null,
        category_id: transaction.category?.id || null,
        source: 'manual',
        source_name: 'Manual Entry',
        pending: false,
        tags: transaction.tags,
        notes: transaction.notes,
        plaid_transaction_id: null,
        plaid_account_id: null,
        plaid_category: null,
        plaid_category_id: null,
        payment_channel: null,
      })

      if (error) {
        console.error('Error adding transaction:', error)
        throw new Error('Failed to save transaction')
      }
    }

    // Refresh transactions
    await fetchTransactions()
  }

  const handleDeleteTransaction = async (transactionId: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)

    if (error) {
      console.error('Error deleting transaction:', error)
      throw new Error('Failed to delete transaction')
    }

    // Refresh transactions
    await fetchTransactions()
  }

  const handleTransactionClick = (transaction: UITransaction) => {
    // Find the category from uiCategories to get the full UICategory object
    const category = transaction.category_id
      ? uiCategories.find(c => c.id === transaction.category_id) || null
      : null

    setEditingTransaction({
      id: transaction.id,
      merchant: transaction.merchant,
      amount: transaction.amount,
      date: transaction.rawDate,
      category,
      tags: transaction.tags,
      notes: transaction.notes,
    })
    setIsAddModalOpen(true)
  }

  const handleAddNewTransaction = () => {
    setEditingTransaction(null)
    setIsAddModalOpen(true)
  }

  const handleModalClose = () => {
    setIsAddModalOpen(false)
    setEditingTransaction(null)
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
            <span className="font-semibold text-[#1F1410]">
              ${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>{' '}
            spent {monthData.isCurrentMonth ? 'so far' : 'total'}
          </p>
        </motion.div>

        {/* Month Selector */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className="flex justify-center mb-6"
        >
          <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
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

        {/* Two Column Layout: Transactions (Left) and Budgets (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Transactions Section - Left Column (2/3 width on large screens) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="lg:col-span-2"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xl font-bold text-[#1F1410]">Recent Transactions</h2>
              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAddNewTransaction}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </motion.button>
                <CsvDropzone onFilesAdded={handleCsvImport} />
              </div>
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
                        onClick={() => handleTransactionClick(transaction)}
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

          {/* Category Budgets Progress List - Right Column (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <h2 className="text-xl font-bold text-[#1F1410] mb-4 px-1">Category Budgets</h2>
            <CategoryProgressList categories={categoriesWithTotals} />
          </div>
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

      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        categories={uiCategories}
        defaultDate={new Date().toISOString().split('T')[0]}
        editTransaction={editingTransaction}
      />
    </div>
  )
}
