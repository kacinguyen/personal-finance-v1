import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Utensils,
  ShoppingBag,
  Car,
  Clapperboard,
  Receipt,
  Heart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Calendar,
  Wallet,
  LucideIcon,
  CircleDollarSign,
  Home,
  Dumbbell,
  Plane,
  Scissors,
  ShoppingCart,
  CreditCard,
} from 'lucide-react'
import { CategoryCard } from './CategoryCard'
import { TransactionItem } from './TransactionItem'
import { Category } from './CategoryDropdown'
import { CsvDropzone } from './CsvDropzone'
import { importCSVFiles } from '../lib/csvImport'
import { supabase } from '../lib/supabase'
import type { Transaction as DBTransaction } from '../types/transaction'

type UITransaction = {
  id: string
  icon: LucideIcon
  merchant: string
  category: string
  date: string
  amount: number
  color: string
  source: string
}

// Icon map for converting database icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  Home,
  ShoppingCart,
  Utensils,
  Car,
  Plane,
  ShoppingBag,
  Dumbbell,
  Scissors,
  Clapperboard,
  CreditCard,
  Receipt,
  Heart,
  CircleDollarSign,
}

// Map category names to icons and colors (case-insensitive lookup)
const categoryConfig: Record<string, { icon: LucideIcon; color: string }> = {
  'rent': { icon: Home, color: '#6366F1' },
  'groceries': { icon: ShoppingCart, color: '#10B981' },
  'dining out': { icon: Utensils, color: '#FF6B6B' },
  'transportation': { icon: Car, color: '#38BDF8' },
  'travel': { icon: Plane, color: '#F59E0B' },
  'shopping - general': { icon: ShoppingBag, color: '#A855F7' },
  'fitness': { icon: Dumbbell, color: '#EF4444' },
  'self care': { icon: Scissors, color: '#EC4899' },
  'entertainment': { icon: Clapperboard, color: '#8B5CF6' },
  'subscriptions': { icon: CreditCard, color: '#14B8A6' },
  // Legacy mappings
  'food': { icon: Utensils, color: '#FF6B6B' },
  'shopping': { icon: ShoppingBag, color: '#A855F7' },
  'transport': { icon: Car, color: '#38BDF8' },
  'bills': { icon: Receipt, color: '#F59E0B' },
  'health': { icon: Heart, color: '#10B981' },
}

const defaultCategoryConfig = { icon: CircleDollarSign, color: '#6B7280' }

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

/**
 * Map database transaction to UI transaction format
 */
function mapDBToUI(tx: DBTransaction): UITransaction {
  const categoryKey = (tx.category || '').toLowerCase()
  const config = categoryConfig[categoryKey] || defaultCategoryConfig

  return {
    id: tx.id,
    icon: config.icon,
    merchant: tx.merchant,
    category: tx.category || 'Uncategorized',
    date: formatDisplayDate(tx.date),
    amount: Math.abs(tx.amount), // UI shows positive amounts
    color: config.color,
    source: tx.source_name || tx.source,
  }
}

export function TransactionFeed() {
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<UITransaction[]>([])
  const [loading, setLoading] = useState(true)

  const expectedIncome = 3500

  // Fetch budgets from database
  const fetchBudgets = useCallback(async () => {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('is_active', true)
      .order('category')

    if (error) {
      console.error('Error fetching budgets:', error)
    } else if (data) {
      const budgetCategories: Category[] = data.map((budget: {
        category: string
        monthly_limit: number
        icon: string
        color: string
      }) => ({
        icon: iconMap[budget.icon] || CircleDollarSign,
        name: budget.category,
        total: 0,
        budget: Number(budget.monthly_limit),
        color: budget.color,
      }))
      setCategories(budgetCategories)
    }
  }, [])

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
  }, [])

  // Load budgets and transactions on mount
  useEffect(() => {
    fetchBudgets()
    fetchTransactions()
  }, [fetchBudgets, fetchTransactions])

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

  const categoriesWithTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.amount
    })
    return categories.map((cat) => ({
      ...cat,
      total: Math.round((totals[cat.name] || 0) * 100) / 100,
    }))
  }, [categories, transactions])

  const totalSpent = useMemo(
    () => transactions.reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  )

  const budgetTracking = useMemo(() => {
    const totalBudget = categories.reduce((sum, cat) => sum + cat.budget, 0)
    const expectedSpending = (totalBudget * monthData.daysElapsed) / monthData.daysInMonth
    const difference = totalSpent - expectedSpending
    const percentageOfBudget = (totalSpent / totalBudget) * 100
    const remainingIncome = expectedIncome - totalSpent
    const percentageOfIncome = (totalSpent / expectedIncome) * 100

    let status: 'under' | 'on-track' | 'over'
    let statusColor: string
    let statusText: string

    if (difference < -totalBudget * 0.1) {
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
  }, [categories, totalSpent, monthData, expectedIncome])

  const handleCategoryChange = (transactionId: string, category: Category) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === transactionId
          ? { ...t, category: category.name, icon: category.icon, color: category.color }
          : t
      )
    )
  }

  const handleCreateCategory = (newCategory: Category) => {
    setCategories((prev) => {
      if (prev.some((c) => c.name.toLowerCase() === newCategory.name.toLowerCase())) {
        return prev
      }
      return [...prev, newCategory]
    })
  }

  const handleCsvImport = async (files: File[]) => {
    const count = await importCSVFiles(files)
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                <Sparkles className="w-8 h-8 text-[#F59E0B]" />
              </motion.div>
              <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Your Spending</h1>
            </div>
            <CsvDropzone onFilesAdded={handleCsvImport} />
          </div>
          <p className="text-[#1F1410]/60 text-lg">
            January 2024 •{' '}
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

        {/* Category Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-10">
          {categoriesWithTotals.map((category, index) => (
            <CategoryCard
              key={category.name}
              icon={category.icon}
              name={category.name}
              total={category.total}
              budget={category.budget}
              color={category.color}
              index={index}
            />
          ))}
        </div>

        {/* Transactions Section */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.4 }}>
          <h2 className="text-xl font-bold text-[#1F1410] mb-4 px-1">Recent Transactions</h2>
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
              <div className="divide-y divide-[#1F1410]/5">
                {transactions.map((transaction, index) => (
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
                    categories={categories}
                    onCategoryChange={handleCategoryChange}
                    onCreateCategory={handleCreateCategory}
                  />
                ))}
              </div>
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
