import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  LucideIcon,
  Loader2,
  Trash2,
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
import { BudgetCategorySection, SavingsGoalsSection } from '../budget/BudgetCategorySection'

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
  } | null
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
  lastMonthSpent: number
  color: string
  type: CategoryType
}

// Grouped category structure for nested display
export type CategoryGroup = {
  parent: CategoryBudget
  children: CategoryBudget[]
}

// Database savings goal type
type DBGoal = {
  id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  goal_type: string
  icon: string
  color: string
  is_active: boolean
  monthly_budget: number | null
}

// UI savings goal type
export type SavingsGoal = {
  id: string
  name: string
  icon: LucideIcon
  color: string
  targetAmount: number
  currentAmount: number
  monthlyBudget: number
  deadline: Date | null
  progress: number
}

// Convert DB goal to UI format
function dbGoalToUI(goal: DBGoal): SavingsGoal {
  const targetDate = goal.deadline ? new Date(goal.deadline) : null
  const remaining = Number(goal.target_amount) - Number(goal.current_amount)

  // Calculate suggested monthly based on deadline, or use stored monthly_budget
  let monthlyBudget = goal.monthly_budget ? Number(goal.monthly_budget) : 0
  if (!monthlyBudget && targetDate) {
    const now = new Date()
    const monthsUntilTarget = Math.max(1,
      (targetDate.getFullYear() - now.getFullYear()) * 12 +
      (targetDate.getMonth() - now.getMonth())
    )
    monthlyBudget = Math.ceil(remaining / monthsUntilTarget)
  }

  return {
    id: goal.id,
    name: goal.name,
    icon: getIcon(goal.icon),
    color: goal.color,
    targetAmount: Number(goal.target_amount),
    currentAmount: Number(goal.current_amount),
    monthlyBudget,
    deadline: targetDate,
    progress: Number(goal.target_amount) > 0
      ? (Number(goal.current_amount) / Number(goal.target_amount)) * 100
      : 0,
  }
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
    lastMonthSpent: 0, // TODO: Calculate from transactions
    color: budget.color,
    type: budget.budget_type,
  }
}

// Group budgets by parent-child relationship
function groupByParent(budgets: CategoryBudget[]): CategoryGroup[] {
  const groups: CategoryGroup[] = []
  const childMap = new Map<string, CategoryBudget[]>()
  const standaloneItems: CategoryBudget[] = []

  // Separate parents and children
  const parents = budgets.filter(b => !b.parent_id)
  const children = budgets.filter(b => b.parent_id)

  // Map children to their parent category_id
  children.forEach(child => {
    if (child.parent_id) {
      const existing = childMap.get(child.parent_id) || []
      existing.push(child)
      childMap.set(child.parent_id, existing)
    }
  })

  // Create groups for parents that have children
  parents.forEach(parent => {
    const parentChildren = parent.category_id ? childMap.get(parent.category_id) || [] : []
    if (parentChildren.length > 0) {
      groups.push({ parent, children: parentChildren })
    } else {
      standaloneItems.push(parent)
    }
  })

  // Add standalone items as single-item groups
  standaloneItems.forEach(item => {
    groups.push({ parent: item, children: [] })
  })

  return groups
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

export function BudgetView() {
  const { userId } = useUser()
  const { createCategory: createDbCategory, deleteCategory: deleteDbCategory, seedDefaultCategories, needCategories, wantCategories, loading: categoriesLoading } = useCategories()
  const [budgets, setBudgets] = useState<CategoryBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const { expectedIncome } = useExpectedIncome(selectedMonth)

  // Expanded groups state for nested categories
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Savings goals state
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])

  // Delete confirmation state
  const [deletingInfo, setDeletingInfo] = useState<{
    budgetId: string
    categoryId: string | null
    name: string
    childBudgetIds?: string[]
    childCategoryIds?: string[]
  } | null>(null)

  const toggleExpandGroup = useCallback((id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

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
          color
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
      // Auto-create $0 budgets for need/want categories that don't have one yet
      const allExpenseCategories = [...needCategories, ...wantCategories]
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
              color
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
  }, [seedDefaultData, categoriesLoading, needCategories, wantCategories, userId])

  // Fetch savings goals from database
  const fetchSavingsGoals = useCallback(async () => {
    const { data, error } = await supabase
      .from('goals')
      .select('id, name, target_amount, current_amount, deadline, goal_type, icon, color, is_active, monthly_budget')
      .eq('is_active', true)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching savings goals:', error)
      return
    }

    if (data) {
      setSavingsGoals(data.map(dbGoalToUI))
    }
  }, [])

  // Fetch on mount and when selected month changes
  useEffect(() => {
    fetchBudgets()
    fetchSavingsGoals()
  }, [fetchBudgets, fetchSavingsGoals, selectedMonth])

  // Separate categories by type and group by parent
  const needsCategories = useMemo(
    () => budgets.filter((c) => c.type === 'need'),
    [budgets],
  )
  const wantsCategories = useMemo(
    () => budgets.filter((c) => c.type === 'want'),
    [budgets],
  )

  // Group categories by parent-child for nested display
  const needsGroups = useMemo(
    () => groupByParent(needsCategories),
    [needsCategories],
  )
  const wantsGroups = useMemo(
    () => groupByParent(wantsCategories),
    [wantsCategories],
  )

  const needsBudget = useMemo(
    () => needsCategories.reduce((sum, cat) => sum + cat.budget, 0),
    [needsCategories],
  )

  const wantsBudget = useMemo(
    () => wantsCategories.reduce((sum, cat) => sum + cat.budget, 0),
    [wantsCategories],
  )

  const savingsBudget = useMemo(
    () => savingsGoals.reduce((sum, goal) => sum + goal.monthlyBudget, 0),
    [savingsGoals],
  )

  const totalBudget = useMemo(
    () => budgets.reduce((sum, cat) => sum + cat.budget, 0) + savingsBudget,
    [budgets, savingsBudget],
  )

  // Update budget in database (debounced)
  const updateBudgetInDB = useCallback(async (id: string, value: number) => {
    const { error } = await supabase
      .from('budgets')
      .update({ monthly_limit: value })
      .eq('id', id)

    if (error) {
      console.error('Error updating budget:', error)
    }
  }, [])

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

  // Update savings goal monthly budget
  const updateSavingsBudgetInDB = useCallback(async (id: string, value: number) => {
    const { error } = await supabase
      .from('goals')
      .update({ monthly_budget: value })
      .eq('id', id)

    if (error) {
      console.error('Error updating savings budget:', error)
    }
  }, [])

  const handleSavingsBudgetChange = (id: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0

    // Update local state immediately
    setSavingsGoals((prev) =>
      prev.map((goal) =>
        goal.id === id
          ? { ...goal, monthlyBudget: numValue }
          : goal,
      ),
    )

    // Debounce database update
    const key = `savings_${id}`
    if (debounceRef.current[key]) {
      clearTimeout(debounceRef.current[key])
    }
    debounceRef.current[key] = setTimeout(() => {
      updateSavingsBudgetInDB(id, numValue)
    }, 500)
  }

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
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              initial={{
                scale: 0,
              }}
              animate={{
                scale: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
              className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center"
            >
              <Target className="w-6 h-6 text-[#6366F1]" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">
              Budget Plan
            </h1>
          </div>
        </motion.div>

        {/* Month Selector */}
        <div className="flex justify-center mb-6">
          <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        </div>

        {/* Summary Card */}
        <BudgetSummaryCard
          totalBudget={totalBudget}
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
            <AddCategoryDropdown onCreateCategory={handleCreateCategory} />
          </div>

          {/* Needs Section */}
          <BudgetCategorySection
            type="needs"
            groups={needsGroups}
            categoryCount={needsCategories.length}
            onBudgetChange={handleBudgetChange}
            onDeleteCategory={handleDeleteCategoryClick}
            expandedGroups={expandedGroups}
            onToggleExpand={toggleExpandGroup}
            animationDelay={0.3}
          />

          {/* Wants Section */}
          <BudgetCategorySection
            type="wants"
            groups={wantsGroups}
            categoryCount={wantsCategories.length}
            onBudgetChange={handleBudgetChange}
            onDeleteCategory={handleDeleteCategoryClick}
            expandedGroups={expandedGroups}
            onToggleExpand={toggleExpandGroup}
            animationDelay={0.4}
          />

          {/* Savings Section */}
          <SavingsGoalsSection
            savingsGoals={savingsGoals}
            onBudgetChange={handleSavingsBudgetChange}
            animationDelay={0.5}
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
