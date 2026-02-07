import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeftRight,
  CircleDollarSign,
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
  SlidersHorizontal,
  X,
  Split,
  Upload,
  GitMerge,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { TransactionItem } from './TransactionItem'
import { UICategory, dbCategoryToUI } from './CategoryDropdown'
import { AddTransactionModal, TransactionFormData } from './AddTransactionModal'
import { SplitTransactionModal } from './SplitTransactionModal'
import { DuplicateReconciliationModal } from './DuplicateReconciliationModal'
import { importCSVFiles } from '../lib/csvImport'
import { detectDuplicates } from '../lib/duplicateDetection'
import type { DuplicatePair } from '../types/duplicateReconciliation'
import { supabase } from '../lib/supabase'
import { getIcon, DEFAULT_COLOR } from '../lib/iconMap'
import { useCategories } from '../hooks/useCategories'
import { MonthPicker, getMonthRange } from './MonthPicker'
import { TAB_COLORS } from '../lib/colors'
import { SHADOWS } from '../lib/styles'
import type { Transaction as DBTransaction } from '../types/transaction'
import type { TransactionSplit } from '../types/transactionSplit'
import type { UISplit } from '../types/transactionSplit'
import { useUser } from '../hooks/useUser'

type UITransactionSplit = {
  id: string
  amount: number
  category: string | null
  category_id: string | null
  notes: string | null
  color: string
}

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
  needs_review: boolean
  splits: UITransactionSplit[]
}

type FilterType = 'all' | 'income' | 'expense' | 'transfer'
type ReviewFilter = 'all' | 'to_review' | 'reviewed'

type Filters = {
  type: FilterType
  reviewStatus: ReviewFilter
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
  const [rawTransactions, setRawTransactions] = useState<DBTransaction[]>([])
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
    reviewStatus: 'all',
    categoryId: null,
    accountSource: null,
    searchQuery: '',
  })
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)
  const [showSourceDropdown, setShowSourceDropdown] = useState(false)
  const [showFiltersPanel, setShowFiltersPanel] = useState(false)
  const [filterDropdownPos, setFilterDropdownPos] = useState<{ top: number; left: number } | null>(null)
  const filterButtonRef = useRef<HTMLButtonElement>(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false)
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  const mapDBToUI = useCallback((tx: DBTransaction, splits: TransactionSplit[] = []): UITransaction => {
    let category = tx.category_id
      ? dbCategories.find(c => c.id === tx.category_id)
      : findCategoryByName(tx.category || '')

    const icon = category ? getIcon(category.icon) : CircleDollarSign
    const color = category?.color || DEFAULT_COLOR

    // Determine transaction type — check transfer category first since
    // transfers can have positive or negative amounts
    let type: 'income' | 'expense' | 'transfer' = 'expense'
    if (category?.category_type === 'transfer' || transferCategories.some(tc => tc.id === tx.category_id)) {
      type = 'transfer'
    } else if (tx.amount > 0) {
      type = 'income'
    }

    // Map splits to UI format
    const uiSplits: UITransactionSplit[] = splits.map(split => {
      const splitCategory = split.category_id
        ? dbCategories.find(c => c.id === split.category_id)
        : null
      return {
        id: split.id,
        amount: split.amount,
        category: splitCategory?.name || split.category || null,
        category_id: split.category_id,
        notes: split.notes,
        color: splitCategory?.color || DEFAULT_COLOR,
      }
    })

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
      needs_review: tx.needs_review ?? false,
      splits: uiSplits,
    }
  }, [dbCategories, findCategoryByName, transferCategories])

  // Fetch transactions from Supabase for selected month
  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)

    // Fetch transactions
    const { data: txData, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false })

    if (txError) {
      console.error('Error fetching transactions:', txError)
      setLoading(false)
      return
    }

    if (!txData) {
      setTransactions([])
      setRawTransactions([])
      setLoading(false)
      return
    }

    setRawTransactions(txData as DBTransaction[])

    // Fetch all splits for these transactions
    const txIds = txData.map(tx => tx.id)
    const { data: splitsData } = await supabase
      .from('transaction_splits')
      .select('*')
      .in('transaction_id', txIds)

    // Group splits by transaction_id
    const splitsByTxId = new Map<string, TransactionSplit[]>()
    if (splitsData) {
      for (const split of splitsData as TransactionSplit[]) {
        const existing = splitsByTxId.get(split.transaction_id) || []
        existing.push(split)
        splitsByTxId.set(split.transaction_id, existing)
      }
    }

    // Map transactions with their splits
    const uiTransactions = (txData as DBTransaction[]).map(tx =>
      mapDBToUI(tx, splitsByTxId.get(tx.id) || [])
    )
    setTransactions(uiTransactions)
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

      // Review status filter
      if (filters.reviewStatus === 'to_review' && !tx.needs_review) return false
      if (filters.reviewStatus === 'reviewed' && tx.needs_review) return false

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

  // To Review count
  const toReviewCount = useMemo(() => {
    return transactions.filter(tx => tx.needs_review).length
  }, [transactions])

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
        needs_review: false,
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

  const handleMarkAsReviewed = async (transactionId: string) => {
    const { error } = await supabase
      .from('transactions')
      .update({ needs_review: false })
      .eq('id', transactionId)

    if (error) {
      console.error('Error marking transaction as reviewed:', error)
      return
    }

    // Update local state to avoid full refetch
    setTransactions(prev =>
      prev.map(tx =>
        tx.id === transactionId ? { ...tx, needs_review: false } : tx
      )
    )
    setRawTransactions(prev =>
      prev.map(tx =>
        tx.id === transactionId ? { ...tx, needs_review: false } : tx
      )
    )
  }

  const handleSaveSplits = async (splits: UISplit[]) => {
    if (!selectedTransaction) return

    // Delete existing splits first
    const { error: deleteError } = await supabase
      .from('transaction_splits')
      .delete()
      .eq('transaction_id', selectedTransaction.id)

    if (deleteError) {
      console.error('Error deleting existing splits:', deleteError)
      throw new Error('Failed to update splits')
    }

    // If no splits provided, we're removing all splits
    if (splits.length === 0) {
      await fetchTransactions()
      return
    }

    // Insert new splits
    const splitsToInsert = splits.map(split => ({
      transaction_id: selectedTransaction.id,
      amount: split.amount,
      category: split.category_name,
      category_id: split.category_id,
      notes: split.notes,
    }))

    const { error: insertError } = await supabase
      .from('transaction_splits')
      .insert(splitsToInsert)

    if (insertError) {
      console.error('Error inserting splits:', insertError)
      throw new Error('Failed to save splits')
    }

    await fetchTransactions()
  }

  const toggleFiltersPanel = useCallback(() => {
    if (!showFiltersPanel && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect()
      setFilterDropdownPos({ top: rect.bottom + 8, left: rect.left })
    }
    setShowFiltersPanel(prev => !prev)
    setShowAddDropdown(false)
  }, [showFiltersPanel])

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

  const reviewStatuses: { id: ReviewFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'to_review', label: 'To Review' },
    { id: 'reviewed', label: 'Reviewed' },
  ]

  const selectedCategory = filters.categoryId
    ? allUiCategories.find(c => c.id === filters.categoryId)
    : null

  // Duplicate detection map for detail panel
  const duplicateMap = useMemo(() => {
    const pairs = detectDuplicates(rawTransactions)
    const map = new Map<string, DuplicatePair[]>()
    for (const pair of pairs) {
      const aId = pair.transactionA.id
      const bId = pair.transactionB.id
      map.set(aId, [...(map.get(aId) || []), pair])
      map.set(bId, [...(map.get(bId) || []), pair])
    }
    return map
  }, [rawTransactions])

  const activeFilterCount = [
    filters.type !== 'all',
    filters.reviewStatus !== 'all',
    filters.categoryId !== null,
    filters.accountSource !== null,
  ].filter(Boolean).length

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
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <ArrowLeftRight className="w-8 h-8" style={{ color: TAB_COLORS.transactions }} />
              </motion.div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Transactions</h1>
            </div>
            <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
          </div>
          <p className="text-[#1F1410]/60 text-lg">Manage all your financial transactions</p>
        </motion.div>

        {/* Two Column Layout: Transactions List + Details Panel */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6"
        >
          {/* Left Column: Search/Filters + Transactions List */}
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: SHADOWS.card }}
          >
            {/* Compact Toolbar */}
            <div className="p-3 border-b border-[#1F1410]/5">
              <div className="flex items-center gap-2">
                {/* Collapsible Search */}
                {searchExpanded ? (
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1F1410]/40" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search transactions..."
                      value={filters.searchQuery}
                      onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
                      onBlur={() => {
                        if (!filters.searchQuery) setSearchExpanded(false)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setFilters(f => ({ ...f, searchQuery: '' }))
                          setSearchExpanded(false)
                        }
                      }}
                      className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-[#1F1410]/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6]/30 transition-all"
                    />
                    <button
                      onClick={() => {
                        setFilters(f => ({ ...f, searchQuery: '' }))
                        setSearchExpanded(false)
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1F1410]/30 hover:text-[#1F1410]/60"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSearchExpanded(true)
                      setTimeout(() => searchInputRef.current?.focus(), 0)
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-[#1F1410]/50 hover:text-[#1F1410] hover:bg-[#1F1410]/5 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                )}

                {/* Filter Button */}
                <button
                  ref={filterButtonRef}
                  onClick={toggleFiltersPanel}
                  className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    showFiltersPanel || activeFilterCount > 0
                      ? 'border-[#8B5CF6]/30 bg-[#8B5CF6]/5 text-[#8B5CF6]'
                      : 'border-[#1F1410]/10 text-[#1F1410]/60 hover:border-[#1F1410]/20 hover:text-[#1F1410]'
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="w-4.5 h-4.5 rounded-full bg-[#8B5CF6] text-white text-[10px] font-bold flex items-center justify-center min-w-[18px] px-1">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="flex-1" />

                {/* Add Button with Dropdown */}
                <div className="relative">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowAddDropdown(!showAddDropdown)
                      setShowFiltersPanel(false)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: TAB_COLORS.transactions }}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add</span>
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                  </motion.button>

                  {showAddDropdown && (
                    <div
                      className="absolute top-full right-0 mt-2 bg-white rounded-xl border border-[#1F1410]/10 shadow-lg z-50 min-w-[160px] overflow-hidden"
                      onMouseLeave={() => setShowAddDropdown(false)}
                    >
                      <button
                        onClick={() => {
                          handleAddNewTransaction()
                          setShowAddDropdown(false)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#1F1410]/5 transition-colors text-[#1F1410]"
                      >
                        <Plus className="w-4 h-4 text-[#1F1410]/50" />
                        Manual Add
                      </button>
                      <button
                        onClick={() => {
                          fileInputRef.current?.click()
                          setShowAddDropdown(false)
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#1F1410]/5 transition-colors text-[#1F1410]"
                      >
                        <Upload className="w-4 h-4 text-[#1F1410]/50" />
                        Import CSV
                      </button>
                    </div>
                  )}

                  {/* Hidden file input for CSV import */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleCsvImport(Array.from(e.target.files))
                        e.target.value = ''
                      }
                    }}
                  />
                </div>
              </div>

              {/* Active Filter Chips */}
              {(activeFilterCount > 0 || filters.searchQuery) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {filters.searchQuery && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1F1410]/5 text-xs text-[#1F1410]/70">
                      &ldquo;{filters.searchQuery}&rdquo;
                      <button onClick={() => {
                        setFilters(f => ({ ...f, searchQuery: '' }))
                        if (!filters.searchQuery) setSearchExpanded(false)
                      }} className="text-[#1F1410]/40 hover:text-[#1F1410]/70">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.type !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8B5CF6]/10 text-xs text-[#8B5CF6]">
                      {filterTypes.find(t => t.id === filters.type)?.label}
                      <button onClick={() => setFilters(f => ({ ...f, type: 'all' }))} className="text-[#8B5CF6]/50 hover:text-[#8B5CF6]">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.reviewStatus !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3B82F6]/10 text-xs text-[#3B82F6]">
                      {reviewStatuses.find(s => s.id === filters.reviewStatus)?.label}
                      {filters.reviewStatus === 'to_review' && toReviewCount > 0 && ` (${toReviewCount})`}
                      <button onClick={() => setFilters(f => ({ ...f, reviewStatus: 'all' }))} className="text-[#3B82F6]/50 hover:text-[#3B82F6]">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: `${selectedCategory.color}15`, color: selectedCategory.color }}>
                      {selectedCategory.name}
                      <button onClick={() => setFilters(f => ({ ...f, categoryId: null }))} className="opacity-50 hover:opacity-100">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {filters.accountSource && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1F1410]/5 text-xs text-[#1F1410]/70">
                      {filters.accountSource}
                      <button onClick={() => setFilters(f => ({ ...f, accountSource: null }))} className="text-[#1F1410]/40 hover:text-[#1F1410]/70">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {activeFilterCount > 1 && (
                    <button
                      onClick={() => setFilters({ type: 'all', reviewStatus: 'all', categoryId: null, accountSource: null, searchQuery: '' })}
                      className="text-[10px] text-[#1F1410]/40 hover:text-[#1F1410]/60 transition-colors ml-1"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Transactions List */}
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
                      needsReview={transaction.needs_review}
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

                  {/* Splits */}
                  {selectedTransaction.splits.length > 0 && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0">
                        <Split className="w-4 h-4 text-[#8B5CF6]" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide mb-2">Split Categories</p>
                        <div className="space-y-2">
                          {selectedTransaction.splits.map((split) => (
                            <div
                              key={split.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#1F1410]/[0.02]"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: split.color }}
                                />
                                <span className="text-sm text-[#1F1410]">
                                  {split.category || 'Uncategorized'}
                                </span>
                              </div>
                              <span className="text-sm font-medium text-[#1F1410]">
                                ${Math.abs(split.amount).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Potential Duplicate Warning */}
                {duplicateMap.has(selectedTransaction.id) && (
                  <div className="mt-4 p-3 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#F59E0B] mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#92400E]">
                          Potential Duplicate
                        </p>
                        <p className="text-xs text-[#92400E]/70 mt-0.5">
                          {duplicateMap.get(selectedTransaction.id)!.length} possible {duplicateMap.get(selectedTransaction.id)!.length === 1 ? 'match' : 'matches'} found
                        </p>
                        <button
                          onClick={() => setIsReconcileModalOpen(true)}
                          className="flex items-center gap-1.5 mt-2 text-xs font-medium text-[#92400E] hover:text-[#78350F] transition-colors"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          Resolve
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-4 mt-6 pt-6 border-t border-[#1F1410]/5">
                  {selectedTransaction.needs_review && (
                    <button
                      onClick={() => handleMarkAsReviewed(selectedTransaction.id)}
                      className="flex items-center gap-1.5 text-sm text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Mark Reviewed
                    </button>
                  )}
                  <button
                    onClick={handleEditSelectedTransaction}
                    className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-[#1F1410] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setIsSplitModalOpen(true)}
                    className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-[#8B5CF6] transition-colors"
                  >
                    <Split className="w-3.5 h-3.5" />
                    {selectedTransaction.splits.length > 0 ? 'Edit Split' : 'Split'}
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

      {/* Split Transaction Modal */}
      {selectedTransaction && (
        <SplitTransactionModal
          isOpen={isSplitModalOpen}
          onClose={() => setIsSplitModalOpen(false)}
          onSave={handleSaveSplits}
          transactionAmount={selectedTransaction.amount}
          transactionMerchant={selectedTransaction.merchant}
          categories={allUiCategories}
          existingSplits={selectedTransaction.splits.map(s => ({
            id: s.id,
            amount: Math.abs(s.amount),
            category_id: s.category_id,
            category_name: s.category,
            notes: s.notes,
          }))}
        />
      )}

      {/* Duplicate Reconciliation Modal */}
      <DuplicateReconciliationModal
        isOpen={isReconcileModalOpen}
        onClose={() => setIsReconcileModalOpen(false)}
        transactions={rawTransactions}
        onComplete={fetchTransactions}
      />

      {/* Fixed-position Filter Dropdown (rendered outside overflow-hidden container) */}
      {showFiltersPanel && filterDropdownPos && (
        <>
          {/* Backdrop to close on click outside */}
          <div className="fixed inset-0 z-[99]" onClick={() => setShowFiltersPanel(false)} />

          <div
            className="fixed z-[100] bg-white rounded-xl border border-[#1F1410]/10 shadow-lg p-3 w-[280px]"
            style={{ top: filterDropdownPos.top, left: filterDropdownPos.left }}
          >
            <div className="space-y-3">
              {/* Type */}
              <div>
                <label className="block text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wider mb-1">Type</label>
                <div className="flex flex-wrap gap-1">
                  {filterTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setFilters(f => ({ ...f, type: type.id }))}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        filters.type === type.id
                          ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                          : 'text-[#1F1410]/60 hover:bg-[#1F1410]/5 hover:text-[#1F1410]'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wider mb-1">Status</label>
                <div className="flex flex-wrap gap-1">
                  {reviewStatuses.map((status) => (
                    <button
                      key={status.id}
                      onClick={() => setFilters(f => ({ ...f, reviewStatus: status.id }))}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        filters.reviewStatus === status.id
                          ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                          : 'text-[#1F1410]/60 hover:bg-[#1F1410]/5 hover:text-[#1F1410]'
                      }`}
                    >
                      {status.label}
                      {status.id === 'to_review' && toReviewCount > 0 && (
                        <span className="px-1 py-px rounded text-[9px] font-bold bg-[#3B82F6] text-white min-w-[14px] text-center leading-tight">
                          {toReviewCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wider mb-1">Category</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowCategoryDropdown(!showCategoryDropdown)
                      setShowSourceDropdown(false)
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[#1F1410]/10 text-xs hover:border-[#1F1410]/20 transition-colors w-full"
                  >
                    {selectedCategory ? (
                      <>
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center"
                          style={{ backgroundColor: `${selectedCategory.color}15` }}
                        >
                          <selectedCategory.icon className="w-2.5 h-2.5" style={{ color: selectedCategory.color }} />
                        </div>
                        <span className="text-[#1F1410] flex-1 text-left">{selectedCategory.name}</span>
                      </>
                    ) : (
                      <span className="text-[#1F1410]/50 flex-1 text-left">All Categories</span>
                    )}
                    <ChevronDown className="w-3 h-3 text-[#1F1410]/40" />
                  </button>

                  {showCategoryDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-[#1F1410]/10 shadow-lg z-[110] min-w-full max-h-[200px] overflow-y-auto">
                      <button
                        onClick={() => {
                          setFilters(f => ({ ...f, categoryId: null }))
                          setShowCategoryDropdown(false)
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-[#1F1410]/50 hover:bg-[#1F1410]/5 transition-colors"
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
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[#1F1410]/5 transition-colors"
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center"
                            style={{ backgroundColor: `${cat.color}15` }}
                          >
                            <cat.icon className="w-2.5 h-2.5" style={{ color: cat.color }} />
                          </div>
                          <span className="text-[#1F1410]">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Source */}
              <div>
                <label className="block text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wider mb-1">Source</label>
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowSourceDropdown(!showSourceDropdown)
                      setShowCategoryDropdown(false)
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[#1F1410]/10 text-xs hover:border-[#1F1410]/20 transition-colors w-full"
                  >
                    <span className={`flex-1 text-left ${filters.accountSource ? 'text-[#1F1410]' : 'text-[#1F1410]/50'}`}>
                      {filters.accountSource || 'All Sources'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-[#1F1410]/40" />
                  </button>

                  {showSourceDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-[#1F1410]/10 shadow-lg z-[110] min-w-full max-h-[200px] overflow-y-auto">
                      <button
                        onClick={() => {
                          setFilters(f => ({ ...f, accountSource: null }))
                          setShowSourceDropdown(false)
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs text-[#1F1410]/50 hover:bg-[#1F1410]/5 transition-colors"
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
                          className="w-full px-3 py-1.5 text-left text-xs text-[#1F1410] hover:bg-[#1F1410]/5 transition-colors"
                        >
                          {source}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
