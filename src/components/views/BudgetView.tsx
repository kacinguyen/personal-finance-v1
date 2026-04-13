import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LucideIcon,
  Loader2,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../hooks/useUser'
import { useCategories } from '../../hooks/useCategories'
import { getIcon } from '../../lib/iconMap'
import { MonthPicker } from '../common/MonthPicker'
import { useExpectedIncome } from '../../hooks/useExpectedIncome'
import type { CategoryType } from '../../types/category'
import { BudgetSummaryCard } from '../budget/BudgetSummaryCard'
import { AddCategoryDropdown } from '../budget/AddCategoryDropdown'
import { BudgetCategoryTable } from '../budget/BudgetCategoryTable'
import { useChatContext } from '../../contexts/ChatContext'
import { formatMonth } from '../../lib/dateUtils'
import { useAuth } from '../../contexts/AuthContext'
import { AGENT_API_URL } from '../../lib/agentApi'

// Database budget type with joined category data
type DBBudgetWithCategory = {
  id: string
  category: string
  category_id: string | null
  monthly_limit: number
  budget_type: CategoryType
  flexibility: 'fixed' | 'variable'
  icon: string
  color: string
  is_active: boolean
  categories: {
    id: string
    parent_id: string | null
    name: string
    icon: string
    color: string
    display_order: number
  } | null
}

// Grouped category structure for nested display (used by BudgetCategorySection)
export type CategoryGroup = {
  parent: CategoryBudget
  children: CategoryBudget[]
}

// UI budget type
export type CategoryBudget = {
  id: string
  category_id: string | null
  parent_id: string | null
  name: string
  icon: LucideIcon
  iconName: string
  budget: number
  lastMonthBudget: number
  lastMonthSpent: number
  color: string
  type: CategoryType
  display_order: number
}



// Convert DB budget to UI format
function dbToUI(budget: DBBudgetWithCategory): CategoryBudget {
  return {
    id: budget.id,
    category_id: budget.category_id,
    parent_id: budget.categories?.parent_id ?? null,
    name: budget.category,
    icon: getIcon(budget.icon),
    iconName: budget.icon,
    budget: Number(budget.monthly_limit),
    lastMonthBudget: 0,
    lastMonthSpent: 0,
    color: budget.color,
    type: budget.budget_type,
    display_order: budget.categories?.display_order ?? 0,
  }
}

// Default budget amounts for seeded categories
const DEFAULT_BUDGET_AMOUNTS: Record<string, number> = {
  'Rent': 2000,
  'Utilities': 200,
  'Internet': 80,
  'Insurance': 200,
  'Car': 300,
  'Rideshare': 100,
  'Public Transportation': 100,
  'Parking': 50,
  'Groceries': 600,
  'Restaurants': 300,
  'Cafes': 100,
  'Subscriptions': 100,
  'Health & Wellness': 150,
  'Self-care': 100,
  'Shopping': 200,
  'Clothing': 150,
  'Shops': 100,
  'Entertainment': 200,
  'Gifts': 100,
  'Other': 100,
}

type BudgetViewProps = {
  selectedMonth: Date
  onMonthChange: (month: Date) => void
}

export function BudgetView({ selectedMonth, onMonthChange }: BudgetViewProps) {
  const { openChat, budgetVersion, setBudgetProposal, messages } = useChatContext()
  const { session } = useAuth()
  const { userId } = useUser()
  const { createCategory: createDbCategory, updateCategory: updateDbCategory, updateCategoryOrder, deleteCategory: deleteDbCategory, seedDefaultCategories, needCategories, wantCategories, incomeCategories, transferCategories, loading: categoriesLoading } = useCategories()
  const [budgets, setBudgets] = useState<CategoryBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const { expectedIncome } = useExpectedIncome(selectedMonth)


  // Delete confirmation state
  const [deletingInfo, setDeletingInfo] = useState<{
    budgetId: string
    categoryId: string | null
    name: string
    childBudgetIds?: string[]
    childCategoryIds?: string[]
  } | null>(null)

  // Seed default categories and budgets for new users
  const seedDefaultData = useCallback(async () => {
    if (!userId || seeding) return

    setSeeding(true)

    // Seed categories first
    const seededCategories = await seedDefaultCategories()

    if (seededCategories.length === 0) {
      setSeeding(false)
      return
    }

    // Create budgets for need/want categories
    const budgetInserts = seededCategories
      .filter(cat => cat.category_type === 'need' || cat.category_type === 'want')
      .map(cat => ({
        user_id: userId,
        category: cat.name,
        category_id: cat.id,
        monthly_limit: DEFAULT_BUDGET_AMOUNTS[cat.name] || 100,
        budget_type: cat.category_type,
        flexibility: ['Rent', 'Insurance', 'Subscriptions', 'Internet'].includes(cat.name) ? 'fixed' : 'variable',
        icon: cat.icon,
        color: cat.color,
        is_active: true,
      }))

    const { data, error } = await supabase
      .from('budgets')
      .insert(budgetInserts)
      .select()

    if (error) {
      console.error('Error seeding budgets:', error)
    } else if (data) {
      setBudgets(data.map(dbToUI))
    }

    setSeeding(false)
  }, [userId, seeding, seedDefaultCategories])

  // Fetch budgets from database with category parent info
  const fetchBudgets = useCallback(async () => {
    if (categoriesLoading) return
    setLoading(true)
    const { data, error } = await supabase
      .from('budgets')
      .select(`
        *,
        categories:category_id (
          id,
          parent_id,
          name,
          icon,
          color,
          display_order
        )
      `)
      .eq('is_active', true)
      .order('category')

    if (error) {
      console.error('Error fetching budgets:', error)
      setLoading(false)
      return
    }

    if (data && data.length > 0) {
      // Auto-create $0 budgets for all categories that don't have one yet
      const allExpenseCategories = [...needCategories, ...wantCategories, ...incomeCategories, ...transferCategories]
      const existingCategoryIds = new Set(data.map(b => b.category_id).filter(Boolean))
      const missingCategories = allExpenseCategories.filter(c => !existingCategoryIds.has(c.id))

      if (missingCategories.length > 0 && userId) {
        const inserts = missingCategories.map(cat => ({
          user_id: userId,
          category: cat.name,
          category_id: cat.id,
          monthly_limit: 0,
          budget_type: cat.category_type,
          flexibility: 'variable' as const,
          icon: cat.icon,
          color: cat.color,
          is_active: true,
        }))

        const { data: newBudgets, error: insertError } = await supabase
          .from('budgets')
          .insert(inserts)
          .select(`
            *,
            categories:category_id (
              id,
              parent_id,
              name,
              icon,
              color,
              display_order
            )
          `)

        if (insertError) {
          console.error('Error auto-creating budgets:', insertError)
        }

        const allBudgets = [...data, ...(newBudgets || [])]
        setBudgets(allBudgets.map(dbToUI))
      } else {
        setBudgets(data.map(dbToUI))
      }

      setLoading(false)
    } else {
      // No budgets found - seed defaults
      setLoading(false)
      await seedDefaultData()
    }
  }, [seedDefaultData, categoriesLoading, needCategories, wantCategories, incomeCategories, transferCategories, userId])


  // Fetch monthly budget snapshots: selected month overrides + last month for comparison
  const fetchMonthlyBudgets = useCallback(async () => {
    const currentMonthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-01`
    const lastMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`

    const { data, error } = await supabase
      .from('budget_months')
      .select('budget_id, monthly_limit, month')
      .in('month', [currentMonthStr, lastMonthStr])

    if (error) {
      console.error('Error fetching monthly budgets:', error)
      return
    }

    if (data && data.length > 0) {
      const currentMonthMap = new Map<string, number>()
      const lastMonthMap = new Map<string, number>()
      for (const d of data) {
        if (d.month === currentMonthStr) {
          currentMonthMap.set(d.budget_id, Number(d.monthly_limit))
        } else {
          lastMonthMap.set(d.budget_id, Number(d.monthly_limit))
        }
      }
      setBudgets(prev =>
        prev.map(b => ({
          ...b,
          // Override budget with month-specific snapshot if it exists
          budget: currentMonthMap.has(b.id) ? currentMonthMap.get(b.id)! : b.budget,
          lastMonthBudget: lastMonthMap.get(b.id) ?? 0,
        }))
      )
    }
  }, [selectedMonth])

  // Fetch on mount and when selected month changes
  useEffect(() => {
    fetchBudgets()
  }, [fetchBudgets, selectedMonth])

  // Refetch budgets when Pachi applies budget changes via chat
  useEffect(() => {
    if (budgetVersion > 0) {
      fetchBudgets()
    }
  }, [budgetVersion, fetchBudgets])

  // Fetch last month budgets after main budgets load
  useEffect(() => {
    if (budgets.length > 0 && !loading) {
      fetchMonthlyBudgets()
    }
  }, [loading, budgets.length, fetchMonthlyBudgets])

  // IDs of categories that are parents (have children) — exclude from totals to avoid double-counting
  const parentCategoryIds = useMemo(() => {
    const ids = new Set<string>()
    for (const b of budgets) {
      if (b.parent_id) ids.add(b.parent_id)
    }
    return ids
  }, [budgets])

  // Only sum leaf categories (those that aren't parents of other categories)
  const leafBudgets = useMemo(
    () => budgets.filter(b => !b.category_id || !parentCategoryIds.has(b.category_id)),
    [budgets, parentCategoryIds],
  )

  const needsBudget = useMemo(
    () => leafBudgets.filter(c => c.type === 'need').reduce((sum, cat) => sum + cat.budget, 0),
    [leafBudgets],
  )

  const wantsBudget = useMemo(
    () => leafBudgets.filter(c => c.type === 'want').reduce((sum, cat) => sum + cat.budget, 0),
    [leafBudgets],
  )

  const savingsBudget = useMemo(
    () => Math.max(0, expectedIncome - needsBudget - wantsBudget),
    [expectedIncome, needsBudget, wantsBudget],
  )

  // Update budget in database (debounced) + upsert monthly snapshot
  const updateBudgetInDB = useCallback(async (id: string, value: number) => {
    if (!userId) return
    const monthStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-01`

    // Write to budget_months for the selected month (scoped change)
    const { error: upsertError } = await supabase
      .from('budget_months')
      .upsert(
        { user_id: userId, budget_id: id, month: monthStr, monthly_limit: value },
        { onConflict: 'budget_id,month' }
      )

    if (upsertError) {
      console.error('Error upserting budget_months:', upsertError)
      return
    }

    // Also update the global default so new months inherit this value
    const { error } = await supabase
      .from('budgets')
      .update({ monthly_limit: value })
      .eq('id', id)

    if (error) {
      console.error('Error updating budget default:', error)
    }
  }, [userId, selectedMonth])

  // Debounce ref for budget updates
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({})

  const handleBudgetChange = (id: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0

    // Update local state immediately
    setBudgets((prev) =>
      prev.map((cat) =>
        cat.id === id
          ? {
              ...cat,
              budget: numValue,
            }
          : cat,
      ),
    )

    // Debounce database update
    if (debounceRef.current[id]) {
      clearTimeout(debounceRef.current[id])
    }
    debounceRef.current[id] = setTimeout(() => {
      updateBudgetInDB(id, numValue)
    }, 500)
  }


  // Handle reorder: given new ordered list, compute display_order and persist
  const handleReorder = useCallback(async (orderedBudgets: CategoryBudget[]) => {
    // Update local state immediately
    const updates: { id: string; display_order: number }[] = []
    const updatedBudgets = orderedBudgets.map((b, i) => {
      const newOrder = (i + 1) * 10
      if (b.category_id) {
        updates.push({ id: b.category_id, display_order: newOrder })
      }
      return { ...b, display_order: newOrder }
    })

    setBudgets(updatedBudgets)

    if (updates.length > 0) {
      await updateCategoryOrder(updates)
    }
  }, [updateCategoryOrder])

  // Handle setting a parent for a category
  const handleSetParent = useCallback(async (categoryId: string, parentId: string | null) => {
    // Prevent circular refs: a category cannot be its own parent
    if (categoryId === parentId) return

    // Check that parentId is not a child of categoryId (prevent cycles)
    if (parentId) {
      const potentialChild = budgets.find(b => b.category_id === parentId)
      if (potentialChild?.parent_id === categoryId) return
    }

    const updated = await updateDbCategory({ id: categoryId, parent_id: parentId ?? null })
    if (!updated) return

    // Update local budget state
    setBudgets(prev =>
      prev.map(b =>
        b.category_id === categoryId
          ? { ...b, parent_id: parentId ?? null }
          : b
      )
    )

    // Also update the budget row's category join info by syncing parent_id
    // (The DB budget reads parent_id from categories, so it's already correct on next fetch)
  }, [budgets, updateDbCategory])

  const handleCreateCategory = async (data: {
    name: string
    icon: string
    color: string
    budget: string
    type: CategoryType
  }) => {
    if (!userId) return

    // First, create the category in the categories table
    const newCategory = await createDbCategory({
      name: data.name,
      icon: data.icon,
      color: data.color,
      category_type: data.type,
      is_system: false,
      is_active: true,
    })

    if (!newCategory) {
      console.error('Failed to create category')
      return
    }

    // Then create the budget linked to the category
    const { data: budgetData, error } = await supabase
      .from('budgets')
      .insert({
        user_id: userId,
        category: data.name,
        category_id: newCategory.id,
        monthly_limit: parseInt(data.budget) || 0,
        budget_type: data.type,
        flexibility: 'variable',
        icon: data.icon,
        color: data.color,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating budget:', error)
    } else if (budgetData) {
      setBudgets((prev) => [...prev, dbToUI(budgetData)])
    }
  }

  // Show delete confirmation modal
  const handleDeleteCategoryClick = (
    budgetId: string,
    categoryId: string | null,
    name: string,
    childBudgetIds?: string[],
    childCategoryIds?: string[],
  ) => {
    setDeletingInfo({ budgetId, categoryId, name, childBudgetIds, childCategoryIds })
  }

  // Confirm delete: remove budget rows + category from DB, update local state
  const handleConfirmDelete = async () => {
    if (!deletingInfo) return

    const { budgetId, categoryId, childBudgetIds, childCategoryIds } = deletingInfo

    // Collect all budget IDs to delete
    const budgetIdsToDelete = [budgetId, ...(childBudgetIds || [])]

    // Delete budget rows
    const { error: budgetError } = await supabase
      .from('budgets')
      .delete()
      .in('id', budgetIdsToDelete)

    if (budgetError) {
      console.error('Error deleting budgets:', budgetError)
      setDeletingInfo(null)
      return
    }

    // Delete child categories first (if parent with children)
    if (childCategoryIds && childCategoryIds.length > 0) {
      for (const childCatId of childCategoryIds) {
        await deleteDbCategory(childCatId)
      }
    }

    // Delete the main category
    if (categoryId) {
      await deleteDbCategory(categoryId)
    }

    // Update local state
    const deletedSet = new Set(budgetIdsToDelete)
    setBudgets(prev => prev.filter(b => !deletedSet.has(b.id)))
    setDeletingInfo(null)
  }

  // Update category name/icon/color/type and sync to budget row
  const handleUpdateCategory = async (
    budgetId: string,
    categoryId: string,
    updates: { name?: string; icon?: string; color?: string; category_type?: CategoryType },
  ) => {
    // 1. Update category in categories table
    const updated = await updateDbCategory({ id: categoryId, ...updates })
    if (!updated) return

    // 2. Update the budget row to keep it in sync
    const budgetUpdates: Record<string, string> = {}
    if (updates.name) budgetUpdates.category = updates.name
    if (updates.icon) budgetUpdates.icon = updates.icon
    if (updates.color) budgetUpdates.color = updates.color
    if (updates.category_type) budgetUpdates.budget_type = updates.category_type

    if (Object.keys(budgetUpdates).length > 0) {
      await supabase.from('budgets').update(budgetUpdates).eq('id', budgetId)
    }

    // 3. Optimistically update local state
    setBudgets(prev =>
      prev.map(b =>
        b.id === budgetId
          ? {
              ...b,
              ...(updates.name ? { name: updates.name } : {}),
              ...(updates.icon ? { icon: getIcon(updates.icon), iconName: updates.icon } : {}),
              ...(updates.color ? { color: updates.color } : {}),
              ...(updates.category_type ? { type: updates.category_type } : {}),
            }
          : b,
      ),
    )
  }

  if (loading || seeding) {
    return (
      <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
          {seeding && (
            <p className="text-sm text-[#1F1410]/60">Setting up your budget categories...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-[#1F1410]">Budget</h1>
            <MonthPicker selectedMonth={selectedMonth} onMonthChange={onMonthChange} />
          </div>
        </motion.div>

        {/* Summary Card */}
        <BudgetSummaryCard
          expectedIncome={expectedIncome}
          needsBudget={needsBudget}
          wantsBudget={wantsBudget}
          savingsBudget={savingsBudget}
        />

        {/* Categories List */}
        <div className="space-y-6">
          {/* Header with Add Button Dropdown */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1F1410]">Categories</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const targetMonth = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-01`
                  openChat(`Suggest budget adjustments for ${formatMonth(selectedMonth)}`)
                  try {
                    const res = await fetch(`${AGENT_API_URL}/budget-suggestions`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${session?.access_token || ''}`,
                      },
                      body: JSON.stringify({
                        targetMonth,
                        chatContext: messages.slice(-6).map((m: any) =>
                          m.parts?.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('') || ''
                        ).filter(Boolean).join('\n'),
                      }),
                    })
                    if (res.ok) {
                      const data = await res.json()
                      const changes = (data.changes || []).map((c: any) => ({
                        ...c,
                        delta: c.newLimit - c.currentLimit,
                      }))
                      if (changes.length > 0) {
                        setBudgetProposal({ targetMonth, changes })
                      }
                    }
                  } catch (e) {
                    console.error('Failed to fetch budget suggestions:', e)
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20 hover:bg-[#14B8A6]/15 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Suggest Budget
              </button>
              <AddCategoryDropdown onCreateCategory={handleCreateCategory} />
            </div>
          </div>

          {/* All Categories Table */}
          <BudgetCategoryTable
            budgets={budgets}
            onBudgetChange={handleBudgetChange}
            onDeleteCategory={handleDeleteCategoryClick}
            onEditCategory={handleUpdateCategory}
            onReorder={handleReorder}
            onSetParent={handleSetParent}
          />

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingInfo && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDeletingInfo(null)}
              className="fixed inset-0 bg-[#1F1410]/40 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1F1410]">Delete Category</h3>
                    <p className="text-sm text-[#1F1410]/60">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-sm text-[#1F1410]/70 mb-6">
                  Are you sure you want to delete <span className="font-semibold">{deletingInfo.name}</span>
                  {deletingInfo.childBudgetIds && deletingInfo.childBudgetIds.length > 0
                    ? ` and its ${deletingInfo.childBudgetIds.length} sub-categories`
                    : ''}
                  ? This will remove the category from transaction dropdowns. Existing transactions will keep their category text.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingInfo(null)}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmDelete}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
