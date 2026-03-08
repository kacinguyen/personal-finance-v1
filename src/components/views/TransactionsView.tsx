import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  CircleDollarSign,
  ChevronLeft,
  ChevronRight,
  LucideIcon,
} from 'lucide-react'
import { TransactionItem } from '../common/TransactionItem'
import type { UICategory } from '../../types/category'
import { dbCategoryToUI } from '../../lib/categoryUtils'
import { AddTransactionModal, TransactionFormData } from '../modals/AddTransactionModal'
import { SplitTransactionModal } from '../modals/SplitTransactionModal'
import { SplitWithOthersModal } from '../modals/SplitWithOthersModal'
import { ResolveReimbursementModal } from '../modals/ResolveReimbursementModal'
import type { PendingReimbursement } from '../../types/pendingReimbursement'
import { DuplicateReconciliationModal } from '../modals/DuplicateReconciliationModal'
import { importCSVFiles } from '../../lib/csvImport'
import { detectDuplicates, detectTransferPairs } from '../../lib/duplicateDetection'
import type { AccountTypeMap } from '../../lib/duplicateDetection'
import type { DuplicatePair } from '../../types/duplicateReconciliation'
import type { AccountType } from '../../types/account'
import { supabase } from '../../lib/supabase'
import { getIcon, DEFAULT_COLOR } from '../../lib/iconMap'
import { useCategories } from '../../hooks/useCategories'
import { useMerchantRules } from '../../hooks/useMerchantRules'
import type { MatchType } from '../../hooks/useMerchantRules'
import { MonthPicker } from '../common/MonthPicker'
import { getMonthRange } from '../../lib/dateUtils'
import type { Transaction as DBTransaction } from '../../types/transaction'
import type { TransactionSplit } from '../../types/transactionSplit'
import type { UISplit } from '../../types/transactionSplit'
import { useUser } from '../../hooks/useUser'
import { TransactionDetailPanel } from '../transactions/TransactionDetailPanel'
import { TransactionFilterPanel } from '../transactions/TransactionFilterPanel'
import { TransactionToolbar } from '../transactions/TransactionToolbar'
import { isDemoMode } from '../../lib/demo'

export type UITransactionSplit = {
  id: string
  amount: number
  category: string | null
  category_id: string | null
  notes: string | null
  color: string
}

export type UITransaction = {
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
  goal_id: string | null
  goal_contribution_amount: number | null
}

export type FilterType = 'all' | 'income' | 'expense' | 'transfer'
export type ReviewFilter = 'all' | 'to_review' | 'reviewed'
export type SortOrder = 'newest' | 'oldest'

export type Filters = {
  type: FilterType
  reviewStatus: ReviewFilter
  categoryId: string | null
  accountSource: string | null
  searchQuery: string
}

export function formatDisplayDate(dateStr: string): string {
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

export function TransactionsView({ onNavigate }: { onNavigate?: (tab: string) => void }) {
  const [showAll, setShowAll] = useState(false)
  const ITEMS_PER_PAGE = 25

  const { userId } = useUser()
  const { categories: dbCategories, findCategoryByName, refetch: refetchCategories, transferCategories } = useCategories()
  const { createRule, findRuleForMerchant } = useMerchantRules()
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
    reviewStatus: 'to_review',
    categoryId: null,
    accountSource: null,
    searchQuery: '',
  })
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')
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
  const [accountTypeMap, setAccountTypeMap] = useState<AccountTypeMap>(new Map())
  const [syncing, setSyncing] = useState(false)
  const [goals, setGoals] = useState<{ id: string; name: string; color: string }[]>([])
  const [isSplitWithOthersModalOpen, setIsSplitWithOthersModalOpen] = useState(false)
  const [isResolveReimbursementModalOpen, setIsResolveReimbursementModalOpen] = useState(false)
  const [pendingReimbursements, setPendingReimbursements] = useState<PendingReimbursement[]>([])

  // Convert DB categories to UI categories with resolved icons (all categories for filtering)
  const allUiCategories = useMemo<UICategory[]>(() => {
    return dbCategories.map(dbCategoryToUI)
  }, [dbCategories])

  // Categories for expenses only (need/want/savings_funded) for adding transactions
  const expenseCategories = useMemo<UICategory[]>(() => {
    return dbCategories
      .filter(c => c.category_type === 'need' || c.category_type === 'want' || c.category_type === 'savings_funded')
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
      goal_id: tx.goal_id ?? null,
      goal_contribution_amount: tx.goal_contribution_amount ?? null,
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

    // Fetch all splits and pending reimbursements for these transactions
    const txIds = txData.map(tx => tx.id)
    const [{ data: splitsData }, { data: reimbursementsData }] = await Promise.all([
      supabase
        .from('transaction_splits')
        .select('*')
        .in('transaction_id', txIds),
      supabase
        .from('pending_reimbursements')
        .select('*')
        .in('transaction_id', txIds),
    ])

    // Group splits by transaction_id
    const splitsByTxId = new Map<string, TransactionSplit[]>()
    if (splitsData) {
      for (const split of splitsData as TransactionSplit[]) {
        const existing = splitsByTxId.get(split.transaction_id) || []
        existing.push(split)
        splitsByTxId.set(split.transaction_id, existing)
      }
    }

    // Store pending reimbursements
    if (reimbursementsData) {
      setPendingReimbursements(reimbursementsData as PendingReimbursement[])
    } else {
      setPendingReimbursements([])
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

  // Fetch accounts to build plaid_account_id → account_type map
  useEffect(() => {
    async function fetchAccountTypes() {
      const { data } = await supabase
        .from('accounts')
        .select('plaid_account_id, account_type')
        .not('plaid_account_id', 'is', null)
      if (data) {
        const map: AccountTypeMap = new Map()
        for (const row of data) {
          if (row.plaid_account_id) {
            map.set(row.plaid_account_id, row.account_type as AccountType)
          }
        }
        setAccountTypeMap(map)
      }
    }
    fetchAccountTypes()
  }, [])

  // Fetch active goals for linking
  useEffect(() => {
    async function fetchGoals() {
      const { data } = await supabase
        .from('goals')
        .select('id, name, color')
        .eq('is_active', true)
        .order('name')
      if (data) setGoals(data)
    }
    fetchGoals()
  }, [])

  // Load transactions when selected month or categories change
  useEffect(() => {
    if (dbCategories.length > 0) {
      fetchTransactions()
    }
  }, [fetchTransactions, dbCategories.length, selectedMonth])

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((tx) => {
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

    // Sort by date
    if (sortOrder === 'oldest') {
      filtered.sort((a, b) => a.rawDate.localeCompare(b.rawDate))
    } else {
      filtered.sort((a, b) => b.rawDate.localeCompare(a.rawDate))
    }

    return filtered
  }, [transactions, filters, sortOrder])

  // To Review count
  const toReviewCount = useMemo(() => {
    return transactions.filter(tx => tx.needs_review).length
  }, [transactions])

  // Reviewed count
  const reviewedCount = useMemo(() => {
    return transactions.filter(tx => !tx.needs_review).length
  }, [transactions])

  // Review tab definitions
  const reviewTabs: { id: ReviewFilter; label: string; count?: number }[] = [
    { id: 'all', label: 'All', count: transactions.length },
    { id: 'to_review', label: 'Needs Review', count: toReviewCount },
    { id: 'reviewed', label: 'Reviewed', count: reviewedCount },
  ]

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  const paginatedTransactions = useMemo(() => {
    if (showAll) return filteredTransactions
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredTransactions, currentPage, showAll])

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
          goal_id: transaction.goal_id || null,
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
        goal_id: transaction.goal_id || null,
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

    // Optimistically remove from local state instead of refetching
    setTransactions(prev => prev.filter(t => t.id !== transactionId))
    setRawTransactions(prev => prev.filter(t => t.id !== transactionId))
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
      goal_id: selectedTransaction.goal_id,
    })
    setIsAddModalOpen(true)
  }

  const handleDeleteSelectedTransaction = async () => {
    if (!selectedTransaction) return
    await handleDeleteTransaction(selectedTransaction.id)
    setSelectedTransaction(null)
  }

  const handleFieldSave = async (transactionId: string, updates: Partial<{
    merchant: string
    amount: number
    date: string
    category: string | null
    category_id: string | null
    tags: string | null
    notes: string | null
    goal_id: string | null
    goal_contribution_amount: number | null
  }>) => {
    // Build DB update payload
    const dbUpdates: Record<string, unknown> = {}
    if (updates.merchant !== undefined) dbUpdates.merchant = updates.merchant
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount
    if (updates.date !== undefined) dbUpdates.date = updates.date
    if (updates.category !== undefined) dbUpdates.category = updates.category
    if (updates.category_id !== undefined) dbUpdates.category_id = updates.category_id
    if (updates.tags !== undefined) dbUpdates.tags = updates.tags
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes
    if (updates.goal_id !== undefined) dbUpdates.goal_id = updates.goal_id
    if (updates.goal_contribution_amount !== undefined) dbUpdates.goal_contribution_amount = updates.goal_contribution_amount

    // Optimistically update rawTransactions
    const prevRaw = rawTransactions
    setRawTransactions(prev =>
      prev.map(tx => tx.id === transactionId ? { ...tx, ...dbUpdates } as DBTransaction : tx)
    )

    // Optimistically re-map the updated transaction
    const updatedRaw = rawTransactions.find(tx => tx.id === transactionId)
    if (updatedRaw) {
      const mergedRaw = { ...updatedRaw, ...dbUpdates } as DBTransaction
      // Find existing splits for this transaction
      const existingSplits = transactions.find(t => t.id === transactionId)?.splits || []
      const splitData: TransactionSplit[] = existingSplits.map(s => ({
        id: s.id,
        transaction_id: transactionId,
        amount: s.amount,
        category: s.category,
        category_id: s.category_id,
        notes: s.notes,
        created_at: '',
        updated_at: '',
      }))
      const updatedUI = mapDBToUI(mergedRaw, splitData)
      setTransactions(prev =>
        prev.map(tx => tx.id === transactionId ? updatedUI : tx)
      )
    }

    const { error } = await supabase
      .from('transactions')
      .update(dbUpdates)
      .eq('id', transactionId)

    if (error) {
      console.error('Error updating transaction field:', error)
      // Revert on error
      setRawTransactions(prevRaw)
      await fetchTransactions()
      return
    }

    // Sync goal_contributions when goal tagging changes
    if (updates.goal_id !== undefined || updates.goal_contribution_amount !== undefined) {
      const tx = rawTransactions.find(t => t.id === transactionId)
      const newGoalId = updates.goal_id !== undefined ? updates.goal_id : tx?.goal_id
      const newAmount = updates.goal_contribution_amount !== undefined
        ? updates.goal_contribution_amount
        : (tx as any)?.goal_contribution_amount

      // Delete any existing contribution for this transaction
      await supabase
        .from('goal_contributions')
        .delete()
        .eq('transaction_id', transactionId)
        .eq('user_id', userId)

      // Create new contribution if goal is set with an amount
      if (newGoalId && newAmount && newAmount > 0) {
        const txDate = tx?.date || new Date().toISOString().split('T')[0]
        const { error: contribError } = await supabase
          .from('goal_contributions')
          .insert({
            goal_id: newGoalId,
            user_id: userId,
            amount: newAmount,
            contribution_date: txDate,
            source: 'transfer',
            transaction_id: transactionId,
            notes: `From transaction: ${tx?.merchant || 'Unknown'}`,
          })

        if (contribError) {
          console.error('Error creating goal contribution:', contribError)
        }
      }
    }
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

  const handleCreateMerchantRule = useCallback(async (
    pattern: string,
    matchType: MatchType,
    categoryId: string,
  ): Promise<boolean> => {
    const rule = await createRule(pattern, matchType, categoryId)
    if (!rule) return false

    // Batch-update existing uncategorized transactions matching this pattern
    const likePattern = matchType === 'exact'
      ? pattern
      : matchType === 'starts_with'
      ? `${pattern}%`
      : `%${pattern}%`

    await supabase
      .from('transactions')
      .update({ category_id: categoryId })
      .is('category_id', null)
      .ilike('merchant', likePattern)

    return true
  }, [createRule])

  const hasRuleForMerchant = useCallback((merchant: string): boolean => {
    return !!findRuleForMerchant(merchant)
  }, [findRuleForMerchant])

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

  // Get pending reimbursement for the selected transaction
  const selectedReimbursement = useMemo(() => {
    if (!selectedTransaction) return null
    return pendingReimbursements.find(r => r.transaction_id === selectedTransaction.id) || null
  }, [selectedTransaction, pendingReimbursements])

  // Get existing split data for the SplitWithOthersModal
  const existingSharedSplit = useMemo(() => {
    if (!selectedReimbursement) return null
    return {
      userShare: selectedReimbursement.user_share,
      othersShare: selectedReimbursement.others_share,
      splitPercentage: selectedReimbursement.split_percentage,
      notes: selectedReimbursement.notes,
    }
  }, [selectedReimbursement])

  const handleSaveSharedSplit = async (
    userShare: number,
    othersShare: number,
    splitPercentage: number | null,
    notes: string | null,
  ) => {
    if (!selectedTransaction || !userId) return

    const originalAmount = selectedReimbursement
      ? selectedReimbursement.original_amount
      : selectedTransaction.amount

    // 1. Update transaction amount to user's share
    const { error: txError } = await supabase
      .from('transactions')
      .update({ amount: userShare, amount_modified_by_split: true })
      .eq('id', selectedTransaction.id)

    if (txError) {
      console.error('Error updating transaction amount:', txError)
      throw new Error('Failed to update transaction')
    }

    // 2. Upsert pending_reimbursements row
    if (selectedReimbursement) {
      const { error: rError } = await supabase
        .from('pending_reimbursements')
        .update({
          original_amount: originalAmount,
          user_share: userShare,
          others_share: othersShare,
          split_percentage: splitPercentage,
          notes,
        })
        .eq('id', selectedReimbursement.id)

      if (rError) {
        console.error('Error updating reimbursement:', rError)
        throw new Error('Failed to update reimbursement')
      }
    } else {
      const { error: rError } = await supabase
        .from('pending_reimbursements')
        .insert({
          user_id: userId,
          transaction_id: selectedTransaction.id,
          original_amount: originalAmount,
          user_share: userShare,
          others_share: othersShare,
          split_percentage: splitPercentage,
          status: 'pending',
          resolved_transaction_id: null,
          notes,
        })

      if (rError) {
        console.error('Error inserting reimbursement:', rError)
        throw new Error('Failed to create reimbursement')
      }
    }

    await fetchTransactions()
  }

  const handleUndoSharedSplit = async () => {
    if (!selectedTransaction || !selectedReimbursement) return

    // 1. Restore transaction amount from original_amount
    const { error: txError } = await supabase
      .from('transactions')
      .update({
        amount: selectedReimbursement.original_amount,
        amount_modified_by_split: false,
      })
      .eq('id', selectedTransaction.id)

    if (txError) {
      console.error('Error restoring transaction amount:', txError)
      return
    }

    // 2. Delete pending_reimbursements row
    const { error: rError } = await supabase
      .from('pending_reimbursements')
      .delete()
      .eq('id', selectedReimbursement.id)

    if (rError) {
      console.error('Error deleting reimbursement:', rError)
    }

    await fetchTransactions()
  }

  const handleResolveReimbursement = async (reimbursementId: string, resolvedTransactionId: string | null) => {
    const { error } = await supabase
      .from('pending_reimbursements')
      .update({
        status: 'resolved',
        resolved_transaction_id: resolvedTransactionId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reimbursementId)

    if (error) {
      console.error('Error resolving reimbursement:', error)
      throw new Error('Failed to resolve reimbursement')
    }

    await fetchTransactions()
  }

  const handleWriteOffReimbursement = async (reimbursementId: string) => {
    const { error } = await supabase
      .from('pending_reimbursements')
      .update({
        status: 'written_off',
        resolved_at: new Date().toISOString(),
      })
      .eq('id', reimbursementId)

    if (error) {
      console.error('Error writing off reimbursement:', error)
      throw new Error('Failed to write off reimbursement')
    }

    await fetchTransactions()
  }

  // Incoming transactions for matching (positive amounts from last 60 days)
  const incomingTransactions = useMemo(() => {
    return transactions
      .filter(tx => tx.amount > 0)
      .map(tx => ({
        id: tx.id,
        merchant: tx.merchant,
        amount: tx.amount,
        date: tx.rawDate,
        source: tx.source,
        category: tx.category,
      }))
  }, [transactions])

  const toggleFiltersPanel = useCallback(() => {
    if (!showFiltersPanel && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect()
      setFilterDropdownPos({ top: rect.bottom + 8, left: rect.left })
    }
    setShowFiltersPanel(prev => !prev)
    setShowAddDropdown(false)
  }, [showFiltersPanel])

  const handleSyncTransactions = useCallback(async () => {
    setSyncing(true)
    try {
      // Fetch active plaid items
      const { data: plaidItems } = await supabase
        .from('plaid_items')
        .select('plaid_item_id, status')
        .eq('status', 'active')

      if (plaidItems && plaidItems.length > 0) {
        await Promise.all(
          plaidItems.map((pi) =>
            Promise.all([
              supabase.functions.invoke('plaid-sync-accounts', {
                body: { plaid_item_id: pi.plaid_item_id },
              }),
              supabase.functions.invoke('plaid-sync-transactions', {
                body: { plaid_item_id: pi.plaid_item_id },
              }),
            ])
          )
        )
      }
      await fetchTransactions()
    } catch (err) {
      console.error('Error syncing transactions:', err)
    }
    setSyncing(false)
  }, [fetchTransactions])

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

  // Find "Credit Card Payment" category for transfer reconciliation
  const ccPaymentCategory = useMemo(() => {
    return transferCategories.find(c => c.name === 'Credit Card Payment') || null
  }, [transferCategories])

  // Duplicate + transfer detection map for detail panel
  const duplicateMap = useMemo(() => {
    const dupPairs = detectDuplicates(rawTransactions)
    const transferPairs = accountTypeMap.size > 0
      ? detectTransferPairs(rawTransactions, accountTypeMap)
      : []
    const allPairs = [...dupPairs, ...transferPairs]
    const map = new Map<string, DuplicatePair[]>()
    for (const pair of allPairs) {
      const aId = pair.transactionA.id
      const bId = pair.transactionB.id
      map.set(aId, [...(map.get(aId) || []), pair])
      map.set(bId, [...(map.get(bId) || []), pair])
    }
    return map
  }, [rawTransactions, accountTypeMap])

  const activeFilterCount = [
    filters.type !== 'all',
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
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Transactions</h1>
            <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
          </div>
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
            className="bg-white rounded-2xl overflow-hidden border border-[#1F1410]/5"
          >
            {/* Compact Toolbar */}
            <TransactionToolbar
              searchExpanded={searchExpanded}
              setSearchExpanded={setSearchExpanded}
              searchInputRef={searchInputRef}
              filters={filters}
              setFilters={setFilters}
              showFiltersPanel={showFiltersPanel}
              toggleFiltersPanel={toggleFiltersPanel}
              filterButtonRef={filterButtonRef}
              activeFilterCount={activeFilterCount}
              showAddDropdown={showAddDropdown}
              setShowAddDropdown={(v) => {
                setShowAddDropdown(v)
                if (v) setShowFiltersPanel(false)
              }}
              onAddNew={handleAddNewTransaction}
              onCsvImport={handleCsvImport}
              fileInputRef={fileInputRef}
              selectedCategory={selectedCategory ?? null}
              allFilterTypes={filterTypes}
              sortOrder={sortOrder}
              onSortChange={setSortOrder}
              onSyncTransactions={isDemoMode ? undefined : handleSyncTransactions}
              syncing={syncing}
            />

            {/* Review Status Tabs */}
            <div className="flex border-b border-[#1F1410]/5">
              {reviewTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilters(f => ({ ...f, reviewStatus: tab.id }))}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
                    filters.reviewStatus === tab.id
                      ? 'text-[#8B5CF6]'
                      : 'text-[#1F1410]/50 hover:text-[#1F1410]/80'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span
                      className={`text-[11px] font-semibold px-1.5 py-px rounded-full min-w-[20px] text-center ${
                        filters.reviewStatus === tab.id
                          ? tab.id === 'to_review' && tab.count > 0
                            ? 'bg-[#3B82F6] text-white'
                            : 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                          : tab.id === 'to_review' && tab.count > 0
                            ? 'bg-[#3B82F6]/10 text-[#3B82F6]'
                            : 'bg-[#1F1410]/5 text-[#1F1410]/40'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                  {filters.reviewStatus === tab.id && (
                    <motion.div
                      layoutId="review-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8B5CF6]"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </button>
              ))}
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
                {filteredTransactions.length > ITEMS_PER_PAGE && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-[#1F1410]/5">
                    <p className="text-sm text-[#1F1410]/50">
                      {showAll
                        ? `Showing all ${filteredTransactions.length}`
                        : `Showing ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of ${filteredTransactions.length}`}
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { setShowAll(!showAll); setCurrentPage(1) }}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-[#1F1410]/5 text-[#1F1410]/60"
                      >
                        {showAll ? 'Show 25' : 'Show All'}
                      </button>
                      {!showAll && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column: Transaction Details Panel */}
          <TransactionDetailPanel
            selectedTransaction={selectedTransaction}
            duplicateMap={duplicateMap}
            categories={expenseCategories}
            incomeCategories={incomeUiCategories}
            transferCategories={transferUiCategories}
            goals={goals}
            onEdit={handleEditSelectedTransaction}
            onDelete={handleDeleteSelectedTransaction}
            onMarkAsReviewed={handleMarkAsReviewed}
            onSplit={() => {
              if (selectedReimbursement) {
                setIsSplitWithOthersModalOpen(true)
              } else {
                setIsSplitModalOpen(true)
              }
            }}
            onReconcile={() => setIsReconcileModalOpen(true)}
            onFieldSave={handleFieldSave}
            onCreateMerchantRule={handleCreateMerchantRule}
            hasRuleForMerchant={hasRuleForMerchant}
            onNavigateToRules={() => onNavigate?.('profile')}
            onResolveReimbursement={() => setIsResolveReimbursementModalOpen(true)}
            pendingReimbursement={selectedReimbursement}
          />
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
        goals={goals}
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
          onSplitWithOthers={selectedTransaction.type === 'expense' ? () => {
            setIsSplitModalOpen(false)
            setIsSplitWithOthersModalOpen(true)
          } : undefined}
        />
      )}

      {/* Split with Others Modal */}
      {selectedTransaction && (
        <SplitWithOthersModal
          isOpen={isSplitWithOthersModalOpen}
          onClose={() => setIsSplitWithOthersModalOpen(false)}
          onSave={handleSaveSharedSplit}
          onRemove={selectedReimbursement ? handleUndoSharedSplit : undefined}
          transactionAmount={selectedReimbursement
            ? selectedReimbursement.original_amount
            : selectedTransaction.amount}
          transactionMerchant={selectedTransaction.merchant}
          existingSplit={existingSharedSplit}
        />
      )}

      {/* Resolve Reimbursement Modal */}
      <ResolveReimbursementModal
        isOpen={isResolveReimbursementModalOpen}
        onClose={() => setIsResolveReimbursementModalOpen(false)}
        reimbursement={selectedReimbursement}
        originalMerchant={selectedTransaction?.merchant || ''}
        originalDate={selectedTransaction?.rawDate || ''}
        incomingTransactions={incomingTransactions}
        onResolve={handleResolveReimbursement}
        onWriteOff={handleWriteOffReimbursement}
      />

      {/* Duplicate Reconciliation Modal */}
      <DuplicateReconciliationModal
        isOpen={isReconcileModalOpen}
        onClose={() => setIsReconcileModalOpen(false)}
        transactions={rawTransactions}
        onComplete={fetchTransactions}
        accountTypeMap={accountTypeMap}
        transferCategoryId={ccPaymentCategory?.id}
        transferCategoryName={ccPaymentCategory?.name}
      />

      {/* Fixed-position Filter Dropdown (rendered outside overflow-hidden container) */}
      {showFiltersPanel && filterDropdownPos && (
        <TransactionFilterPanel
          filters={filters}
          setFilters={setFilters}
          filterDropdownPos={filterDropdownPos}
          showCategoryDropdown={showCategoryDropdown}
          setShowCategoryDropdown={setShowCategoryDropdown}
          showSourceDropdown={showSourceDropdown}
          setShowSourceDropdown={setShowSourceDropdown}
          onClose={() => setShowFiltersPanel(false)}
          allUiCategories={allUiCategories}
          accountSources={accountSources}
        />
      )}
    </div>
  )
}
