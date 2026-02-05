import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeftRight,
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown,
  LucideIcon,
  Calendar,
  CreditCard,
  Tag,
  Hash,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react'
import { TransactionItem } from './TransactionItem'
import { UICategory, dbCategoryToUI } from './CategoryDropdown'
import { CsvDropzone } from './CsvDropzone'
import { AddTransactionModal, TransactionFormData } from './AddTransactionModal'
import { importCSVFiles } from '../lib/csvImport'
import { supabase } from '../lib/supabase'
import { getIcon, DEFAULT_COLOR } from '../lib/iconMap'
import { useCategories } from '../hooks/useCategories'
import { MonthPicker, getMonthRange } from './MonthPicker'
import { TAB_COLORS } from '../lib/colors'
import { SHADOWS } from '../lib/styles'
import type { Transaction as DBTransaction } from '../types/transaction'
import { useUser } from '../hooks/useUser'

type UITransaction = {
  id: string
  icon: LucideIcon
  merchant: string
  category: string
  category_id: string | null
  date: string
  rawDate: string
  amount: number // Actual amount (positive for income, negative for expense)
  displayAmount: number // Absolute value for display
  color: string
  source: string
  tags: string | null
  notes: string | null
  type: 'income' | 'expense' | 'transfer'
}

type FilterType = 'all' | 'income' | 'expense' | 'transfer'

type Filters = {
  type: FilterType
  categoryId: string | null
  accountSource: string | null
  searchQuery: string
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
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

export function TransactionsView() {
  const ITEMS_PER_PAGE = 25

  const { userId } = useUser()
  const { categories: dbCategories, findCategoryByName, refetch: refetchCategories, transferCategories } = useCategories()
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<TransactionFormData | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<UITransaction | null>(null)
  const [filters, setFilters] = useState<Filters>({
    type: 'all',
    categoryId: null,
    accountSource: null,
    searchQuery: '',
  })
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showSourceDropdown, setShowSourceDropdown] = useState(false)

  // Convert DB categories to UI categories with resolved icons (all categories for filtering)
  const allUiCategories = useMemo<UICategory[]>(() => {
    return dbCategories.map(dbCategoryToUI)
  }, [dbCategories])

  // Categories for expenses only (need/want) for adding transactions
  const expenseCategories = useMemo<UICategory[]>(() => {
    return dbCategories
      .filter(c => c.category_type === 'need' || c.category_type === 'want')
      .map(dbCategoryToUI)
  }, [dbCategories])

  // Income categories for the modal
  const incomeUiCategories = useMemo<UICategory[]>(() => {
    return dbCategories
      .filter(c => c.category_type === 'income')
      .map(dbCategoryToUI)
  }, [dbCategories])

  // Transfer categories for the modal
  const transferUiCategories = useMemo<UICategory[]>(() => {
    return dbCategories
      .filter(c => c.category_type === 'transfer')
      .map(dbCategoryToUI)
  }, [dbCategories])

  // Get unique account sources from transactions
  const accountSources = useMemo(() => {
    const sources = new Set<string>()
    transactions.forEach(tx => {
      if (tx.source) sources.add(tx.source)
    })
    return Array.from(sources).sort()
  }, [transactions])

  // Map database transaction to UI transaction format
  const mapDBToUI = useCallback((tx: DBTransaction): UITransaction => {
    let category = tx.category_id
      ? dbCategories.find(c => c.id === tx.category_id)
      : findCategoryByName(tx.category || '')

    const icon = category ? getIcon(category.icon) : CircleDollarSign
    const color = category?.color || DEFAULT_COLOR

    // Determine transaction type
    let type: 'income' | 'expense' | 'transfer' = 'expense'
    if (tx.amount > 0) {
      type = 'income'
    } else if (category?.category_type === 'transfer' || transferCategories.some(tc => tc.id === tx.category_id)) {
      type = 'transfer'
    }

    return {
      id: tx.id,
      icon,
      merchant: tx.merchant,
      category: tx.category || 'Uncategorized',
      category_id: tx.category_id || category?.id || null,
      date: formatDisplayDate(tx.date),
      rawDate: tx.date,
      amount: tx.amount,
      displayAmount: Math.abs(tx.amount),
      color,
      source: tx.source_name || tx.source,
      tags: tx.tags || null,
      notes: tx.notes || null,
      type,
    }
  }, [dbCategories, findCategoryByName, transferCategories])

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

  // Refetch categories on mount
  useEffect(() => {
    refetchCategories()
  }, [refetchCategories])

  // Load transactions when selected month or categories change
  useEffect(() => {
    if (dbCategories.length > 0) {
      fetchTransactions()
    }
  }, [fetchTransactions, dbCategories.length, selectedMonth])

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Type filter
      if (filters.type === 'income' && tx.type !== 'income') return false
      if (filters.type === 'expense' && tx.type !== 'expense') return false
      if (filters.type === 'transfer' && tx.type !== 'transfer') return false

      // Category filter
      if (filters.categoryId && tx.category_id !== filters.categoryId) return false

      // Source filter
      if (filters.accountSource && tx.source !== filters.accountSource) return false

      // Search filter
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase()
        const matchesMerchant = tx.merchant.toLowerCase().includes(query)
        const matchesCategory = tx.category.toLowerCase().includes(query)
        const matchesNotes = tx.notes?.toLowerCase().includes(query)
        if (!matchesMerchant && !matchesCategory && !matchesNotes) return false
      }

      return true
    })
  }, [transactions, filters])

  // Stats calculation
  const stats = useMemo(() => {
    const totalIn = filteredTransactions
      .filter(tx => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0)
    const totalOut = filteredTransactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const net = totalIn - totalOut
    return { totalIn, totalOut, net }
  }, [filteredTransactions])

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredTransactions, currentPage])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, transactions.length])

  const handleCsvImport = async (files: File[]) => {
    if (!userId) {
      console.error('User not authenticated')
      return
    }
    const count = await importCSVFiles(files, userId)
    console.log(`Imported ${count} transactions`)
    await fetchTransactions()
  }

  const handleSaveTransaction = async (transaction: TransactionFormData) => {
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Income is positive, expense/transfer are negative
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
    } else {
      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        merchant: transaction.merchant,
        amount: finalAmount,
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

    await fetchTransactions()
  }

  const handleTransactionClick = (transaction: UITransaction) => {
    setSelectedTransaction(transaction)
  }

  const handleEditSelectedTransaction = () => {
    if (!selectedTransaction) return

    // Find category in the appropriate list based on type
    let category: UICategory | null = null
    if (selectedTransaction.category_id) {
      if (selectedTransaction.type === 'income') {
        category = incomeUiCategories.find(c => c.id === selectedTransaction.category_id) || null
      } else if (selectedTransaction.type === 'transfer') {
        category = transferUiCategories.find(c => c.id === selectedTransaction.category_id) || null
      } else {
        category = expenseCategories.find(c => c.id === selectedTransaction.category_id) || null
      }
    }

    setEditingTransaction({
      id: selectedTransaction.id,
      merchant: selectedTransaction.merchant,
      amount: selectedTransaction.displayAmount,
      date: selectedTransaction.rawDate,
      category,
      tags: selectedTransaction.tags,
      notes: selectedTransaction.notes,
      type: selectedTransaction.type,
    })
    setIsAddModalOpen(true)
  }

  const handleDeleteSelectedTransaction = async () => {
    if (!selectedTransaction) return
    await handleDeleteTransaction(selectedTransaction.id)
    setSelectedTransaction(null)
  }

  const handleAddNewTransaction = () => {
    setEditingTransaction(null)
    setIsAddModalOpen(true)
  }

  const handleModalClose = () => {
    setIsAddModalOpen(false)
    setEditingTransaction(null)
  }

  // Update selected transaction when transactions list changes (e.g. after edit)
  useEffect(() => {
    if (selectedTransaction) {
      const updated = transactions.find(t => t.id === selectedTransaction.id)
      if (updated) {
        setSelectedTransaction(updated)
      } else {
        setSelectedTransaction(null)
      }
    }
  }, [transactions, selectedTransaction?.id])

  const filterTypes: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'income', label: 'Income' },
    { id: 'expense', label: 'Expense' },
    { id: 'transfer', label: 'Transfer' },
  ]

  const selectedCategory = filters.categoryId
    ? allUiCategories.find(c => c.id === filters.categoryId)
    : null

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
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
            >
              <ArrowLeftRight className="w-8 h-8" style={{ color: TAB_COLORS.transactions }} />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Transactions</h1>
          </div>
          <p className="text-[#1F1410]/60 text-lg">Manage all your financial transactions</p>
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

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        >
          {/* Total In */}
          <div
            className="bg-white rounded-2xl p-5"
            style={{ boxShadow: SHADOWS.card }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#10B98115' }}
              >
                <TrendingUp className="w-6 h-6 text-[#10B981]" />
              </div>
              <div>
                <p className="text-sm text-[#1F1410]/50">Total In</p>
                <p className="text-2xl font-bold text-[#10B981]">
                  +${stats.totalIn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Total Out */}
          <div
            className="bg-white rounded-2xl p-5"
            style={{ boxShadow: SHADOWS.card }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#FF6B6B15' }}
              >
                <TrendingDown className="w-6 h-6 text-[#FF6B6B]" />
              </div>
              <div>
                <p className="text-sm text-[#1F1410]/50">Total Out</p>
                <p className="text-2xl font-bold text-[#1F1410]">
                  -${stats.totalOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>

          {/* Net */}
          <div
            className="bg-white rounded-2xl p-5"
            style={{ boxShadow: SHADOWS.card }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: stats.net >= 0 ? '#10B98115' : '#FF6B6B15' }}
              >
                <CircleDollarSign
                  className="w-6 h-6"
                  style={{ color: stats.net >= 0 ? '#10B981' : '#FF6B6B' }}
                />
              </div>
              <div>
                <p className="text-sm text-[#1F1410]/50">Net</p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: stats.net >= 0 ? '#10B981' : '#FF6B6B' }}
                >
                  {stats.net >= 0 ? '+' : '-'}${Math.abs(stats.net).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Filters Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white rounded-2xl p-4 mb-6"
          style={{ boxShadow: SHADOWS.card }}
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Type Filter Buttons */}
            <div className="flex items-center gap-1 bg-[#1F1410]/5 rounded-lg p-1">
              {filterTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilters(f => ({ ...f, type: type.id }))}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    filters.type === type.id
                      ? 'bg-white text-[#1F1410] shadow-sm'
                      : 'text-[#1F1410]/60 hover:text-[#1F1410]'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowCategoryDropdown(!showCategoryDropdown)
                  setShowSourceDropdown(false)
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1F1410]/10 text-sm hover:border-[#1F1410]/20 transition-colors"
              >
                {selectedCategory ? (
                  <>
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${selectedCategory.color}15` }}
                    >
                      <selectedCategory.icon
                        className="w-3 h-3"
                        style={{ color: selectedCategory.color }}
                      />
                    </div>
                    <span className="text-[#1F1410]">{selectedCategory.name}</span>
                  </>
                ) : (
                  <span className="text-[#1F1410]/60">Category</span>
                )}
                <ChevronDown className="w-4 h-4 text-[#1F1410]/40" />
              </button>

              {showCategoryDropdown && (
                <div
                  className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-[#1F1410]/10 shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto"
                  onMouseLeave={() => setShowCategoryDropdown(false)}
                >
                  <button
                    onClick={() => {
                      setFilters(f => ({ ...f, categoryId: null }))
                      setShowCategoryDropdown(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors"
                  >
                    All Categories
                  </button>
                  {allUiCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setFilters(f => ({ ...f, categoryId: cat.id }))
                        setShowCategoryDropdown(false)
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm hover:bg-[#1F1410]/5 transition-colors"
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}15` }}
                      >
                        <cat.icon className="w-3 h-3" style={{ color: cat.color }} />
                      </div>
                      <span className="text-[#1F1410]">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Source Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSourceDropdown(!showSourceDropdown)
                  setShowCategoryDropdown(false)
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1F1410]/10 text-sm hover:border-[#1F1410]/20 transition-colors"
              >
                <span className={filters.accountSource ? 'text-[#1F1410]' : 'text-[#1F1410]/60'}>
                  {filters.accountSource || 'Source'}
                </span>
                <ChevronDown className="w-4 h-4 text-[#1F1410]/40" />
              </button>

              {showSourceDropdown && (
                <div
                  className="absolute top-full left-0 mt-2 bg-white rounded-xl border border-[#1F1410]/10 shadow-lg z-50 min-w-[180px] max-h-[300px] overflow-y-auto"
                  onMouseLeave={() => setShowSourceDropdown(false)}
                >
                  <button
                    onClick={() => {
                      setFilters(f => ({ ...f, accountSource: null }))
                      setShowSourceDropdown(false)
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors"
                  >
                    All Sources
                  </button>
                  {accountSources.map((source) => (
                    <button
                      key={source}
                      onClick={() => {
                        setFilters(f => ({ ...f, accountSource: source }))
                        setShowSourceDropdown(false)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-[#1F1410] hover:bg-[#1F1410]/5 transition-colors"
                    >
                      {source}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1F1410]/40" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.searchQuery}
                onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#1F1410]/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6]/30 transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddNewTransaction}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: TAB_COLORS.transactions }}
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </motion.button>
              <CsvDropzone onFilesAdded={handleCsvImport} />
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.type !== 'all' || filters.categoryId || filters.accountSource || filters.searchQuery) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1F1410]/5">
              <span className="text-xs text-[#1F1410]/50">Active filters:</span>
              {filters.type !== 'all' && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6]">
                  {filters.type}
                </span>
              )}
              {selectedCategory && (
                <span
                  className="px-2 py-1 text-xs font-medium rounded-full"
                  style={{ backgroundColor: `${selectedCategory.color}15`, color: selectedCategory.color }}
                >
                  {selectedCategory.name}
                </span>
              )}
              {filters.accountSource && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#1F1410]/10 text-[#1F1410]/70">
                  {filters.accountSource}
                </span>
              )}
              {filters.searchQuery && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-[#1F1410]/10 text-[#1F1410]/70">
                  "{filters.searchQuery}"
                </span>
              )}
              <button
                onClick={() => setFilters({ type: 'all', categoryId: null, accountSource: null, searchQuery: '' })}
                className="ml-auto text-xs text-[#1F1410]/50 hover:text-[#1F1410] transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </motion.div>

        {/* Two Column Layout: Transactions List + Details Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6"
        >
          {/* Left Column: Transactions List */}
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: SHADOWS.card }}
          >
            {loading ? (
              <div className="p-8 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-8 h-8 border-2 border-[#8B5CF6] border-t-transparent rounded-full mx-auto mb-3"
                />
                <p className="text-[#1F1410]/50">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <CircleDollarSign className="w-12 h-12 text-[#1F1410]/20 mx-auto mb-3" />
                <p className="text-[#1F1410]/50 mb-2">
                  {transactions.length === 0 ? 'No transactions yet' : 'No transactions match your filters'}
                </p>
                <p className="text-sm text-[#1F1410]/40">
                  {transactions.length === 0
                    ? 'Add a transaction or import a CSV to get started'
                    : 'Try adjusting your filters'}
                </p>
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
                      amount={transaction.displayAmount}
                      color={transaction.color}
                      source={transaction.source}
                      type={transaction.type}
                      index={index}
                      isSelected={selectedTransaction?.id === transaction.id}
                      onClick={() => handleTransactionClick(transaction)}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-[#1F1410]/5">
                    <p className="text-sm text-[#1F1410]/50">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of{' '}
                      {filteredTransactions.length}
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

          {/* Right Column: Transaction Details Panel */}
          <div
            className="bg-white rounded-2xl overflow-hidden lg:sticky lg:top-8 h-fit"
            style={{ boxShadow: SHADOWS.card }}
          >
            {selectedTransaction ? (
              <div className="p-6">
                {/* Header with merchant and amount */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: selectedTransaction.color }}
                    >
                      <selectedTransaction.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[#1F1410]">{selectedTransaction.merchant}</h3>
                      <p
                        className="text-2xl font-bold"
                        style={{
                          color: selectedTransaction.type === 'income' ? '#10B981' :
                                 selectedTransaction.type === 'transfer' ? '#8B5CF6' : '#1F1410'
                        }}
                      >
                        {selectedTransaction.type === 'income' ? '+' : '-'}${selectedTransaction.displayAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  {/* Type */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                      <CircleDollarSign className="w-4 h-4 text-[#1F1410]/50" />
                    </div>
                    <div>
                      <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Type</p>
                      <p className="text-sm font-medium text-[#1F1410] capitalize">{selectedTransaction.type}</p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                      <Tag className="w-4 h-4 text-[#1F1410]/50" />
                    </div>
                    <div>
                      <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Category</p>
                      <p className="text-sm font-medium" style={{ color: selectedTransaction.color }}>
                        {selectedTransaction.category}
                      </p>
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-[#1F1410]/50" />
                    </div>
                    <div>
                      <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Date</p>
                      <p className="text-sm font-medium text-[#1F1410]">
                        {new Date(selectedTransaction.rawDate + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Source */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-[#1F1410]/50" />
                    </div>
                    <div>
                      <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Source</p>
                      <p className="text-sm font-medium text-[#1F1410]">{selectedTransaction.source}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  {selectedTransaction.tags && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-4 h-4 text-[#1F1410]/50" />
                      </div>
                      <div>
                        <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Tags</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedTransaction.tags.split(',').map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#1F1410]/5 text-[#1F1410]/70"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedTransaction.notes && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-[#1F1410]/50" />
                      </div>
                      <div>
                        <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Notes</p>
                        <p className="text-sm text-[#1F1410]/70 mt-0.5">{selectedTransaction.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4 mt-6 pt-6 border-t border-[#1F1410]/5">
                  <button
                    onClick={handleEditSelectedTransaction}
                    className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-[#1F1410] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteSelectedTransaction}
                    className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center">
                <CircleDollarSign className="w-12 h-12 text-[#1F1410]/10 mx-auto mb-3" />
                <p className="text-[#1F1410]/40 text-sm">Select a transaction to view details</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Add/Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        categories={expenseCategories}
        incomeCategories={incomeUiCategories}
        transferCategories={transferUiCategories}
        defaultDate={new Date().toISOString().split('T')[0]}
        editTransaction={editingTransaction}
      />
    </div>
  )
}
