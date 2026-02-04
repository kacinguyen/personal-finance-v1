import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Plus,
  AlertCircle,
  CheckCircle2,
  LucideIcon,
  ChevronDown,
  Sparkles,
  Shield,
  Loader2,
  PiggyBank,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import { useCategories } from '../hooks/useCategories'
import { getIcon, availableIcons, availableColors } from '../lib/iconMap'
import { MonthPicker, getMonthRange } from './MonthPicker'
import type { CategoryType } from '../types/category'

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
type CategoryBudget = {
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
type CategoryGroup = {
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
type SavingsGoal = {
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

// CategoryRow component - compact row layout for stacked display
function CategoryRow({
  category,
  index,
  onBudgetChange,
  isChild = false,
}: {
  category: CategoryBudget
  index: number
  onBudgetChange: (id: string, value: string) => void
  isChild?: boolean
}) {
  const Icon = category.icon
  const difference = category.budget - category.lastMonthSpent
  const isOverLastMonth = difference < 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`flex items-center justify-between py-2 ${isChild ? 'pl-6' : ''}`}
    >
      {/* Left section: Icon + Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className={`rounded-lg flex items-center justify-center flex-shrink-0 ${isChild ? 'w-7 h-7' : 'w-9 h-9'}`}
          style={{ backgroundColor: `${category.color}15` }}
        >
          <Icon className={isChild ? 'w-3.5 h-3.5' : 'w-4.5 h-4.5'} style={{ color: category.color }} />
        </motion.div>
        <div className="min-w-0">
          <h3 className={`text-[#1F1410] truncate ${isChild ? 'text-sm' : 'font-semibold'}`}>
            {category.name}
          </h3>
          <p className="text-xs text-[#1F1410]/40">
            Last month: ${category.lastMonthSpent.toLocaleString()}
            {category.lastMonthSpent > 0 && (
              <span
                className={`ml-1 ${isOverLastMonth ? 'text-[#FF6B6B]' : 'text-[#10B981]'}`}
              >
                {isOverLastMonth ? '' : '+'}${difference.toLocaleString()}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Right section: Budget input */}
      <div className="relative flex-shrink-0">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 text-sm font-medium">
          $
        </span>
        <input
          type="text"
          value={category.budget}
          onChange={(e) => onBudgetChange(category.id, e.target.value)}
          className={`pl-6 pr-3 py-1.5 text-right font-semibold text-[#1F1410] bg-[#1F1410]/[0.03] rounded-lg focus:bg-white focus:ring-2 focus:ring-[#6366F1]/20 focus:outline-none transition-all text-sm ${isChild ? 'w-24' : 'w-28'}`}
        />
      </div>
    </motion.div>
  )
}

// CategoryGroupRow component - parent with collapsible children
function CategoryGroupRow({
  group,
  startIndex,
  onBudgetChange,
  expandedGroups,
  onToggleExpand,
}: {
  group: CategoryGroup
  startIndex: number
  onBudgetChange: (id: string, value: string) => void
  expandedGroups: Set<string>
  onToggleExpand: (id: string) => void
}) {
  const Icon = group.parent.icon
  const hasChildren = group.children.length > 0
  const isExpanded = expandedGroups.has(group.parent.id)

  // Calculate totals for parent row
  const parentBudget = group.parent.budget
  const childrenBudget = group.children.reduce((sum, c) => sum + c.budget, 0)
  const totalBudget = parentBudget + childrenBudget
  const parentLastMonth = group.parent.lastMonthSpent
  const childrenLastMonth = group.children.reduce((sum, c) => sum + c.lastMonthSpent, 0)
  const totalLastMonth = parentLastMonth + childrenLastMonth
  const difference = totalBudget - totalLastMonth
  const isOverLastMonth = difference < 0

  return (
    <div>
      {/* Parent row */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: startIndex * 0.05, duration: 0.3 }}
        className="flex items-center justify-between py-2"
      >
        {/* Left section: Expand button + Icon + Info */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(group.parent.id)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[#1F1410]/5 transition-colors flex-shrink-0"
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-[#1F1410]/40" />
              </motion.div>
            </button>
          ) : (
            <div className="w-5" />
          )}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${group.parent.color}15` }}
          >
            <Icon className="w-4.5 h-4.5" style={{ color: group.parent.color }} />
          </motion.div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[#1F1410] truncate">
                {group.parent.name}
              </h3>
              {hasChildren && (
                <span className="text-[10px] text-[#1F1410]/40 bg-[#1F1410]/5 px-1.5 py-0.5 rounded">
                  {group.children.length}
                </span>
              )}
            </div>
            <p className="text-xs text-[#1F1410]/40">
              Last month: ${totalLastMonth.toLocaleString()}
              {totalLastMonth > 0 && (
                <span
                  className={`ml-1 ${isOverLastMonth ? 'text-[#FF6B6B]' : 'text-[#10B981]'}`}
                >
                  {isOverLastMonth ? '' : '+'}${difference.toLocaleString()}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right section: Total budget display or input */}
        <div className="relative flex-shrink-0">
          {hasChildren ? (
            <div className="w-28 px-3 py-1.5 text-right font-semibold text-[#1F1410]/60 text-sm">
              ${totalBudget.toLocaleString()}
            </div>
          ) : (
            <>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 text-sm font-medium">
                $
              </span>
              <input
                type="text"
                value={group.parent.budget}
                onChange={(e) => onBudgetChange(group.parent.id, e.target.value)}
                className="w-28 pl-6 pr-3 py-1.5 text-right font-semibold text-[#1F1410] bg-[#1F1410]/[0.03] rounded-lg focus:bg-white focus:ring-2 focus:ring-[#6366F1]/20 focus:outline-none transition-all text-sm"
              />
            </>
          )}
        </div>
      </motion.div>

      {/* Children rows */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-l-2 border-[#1F1410]/5 ml-2.5">
              {group.children.map((child, childIndex) => (
                <CategoryRow
                  key={child.id}
                  category={child}
                  index={startIndex + 1 + childIndex}
                  onBudgetChange={onBudgetChange}
                  isChild
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// SavingsGoalRow component - displays a savings goal with monthly allocation
function SavingsGoalRow({
  goal,
  index,
  onBudgetChange,
}: {
  goal: SavingsGoal
  index: number
  onBudgetChange: (id: string, value: string) => void
}) {
  const Icon = goal.icon
  const remaining = goal.targetAmount - goal.currentAmount

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-center justify-between py-2"
    >
      {/* Left section: Icon + Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${goal.color}15` }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: goal.color }} />
        </motion.div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-[#1F1410] truncate">
            {goal.name}
          </h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[#1F1410]/40">
              ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
            </p>
            <div className="flex-1 max-w-20 h-1.5 bg-[#1F1410]/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(goal.progress, 100)}%`,
                  backgroundColor: goal.color,
                }}
              />
            </div>
            <span className="text-[10px] text-[#1F1410]/40">
              {Math.round(goal.progress)}%
            </span>
          </div>
        </div>
      </div>

      {/* Right section: Monthly budget input */}
      <div className="relative flex-shrink-0">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 text-sm font-medium">
          $
        </span>
        <input
          type="text"
          value={goal.monthlyBudget}
          onChange={(e) => onBudgetChange(goal.id, e.target.value)}
          className="w-28 pl-6 pr-3 py-1.5 text-right font-semibold text-[#1F1410] bg-[#1F1410]/[0.03] rounded-lg focus:bg-white focus:ring-2 focus:ring-[#38BDF8]/20 focus:outline-none transition-all text-sm"
        />
      </div>
    </motion.div>
  )
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
  const { createCategory: createDbCategory, seedDefaultCategories } = useCategories()
  const [budgets, setBudgets] = useState<CategoryBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [expectedIncome, setExpectedIncome] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  // Add category dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0])
  const [selectedColor, setSelectedColor] = useState(availableColors[6])
  const [newBudget, setNewBudget] = useState('')
  const [selectedType, setSelectedType] = useState<CategoryType>('need')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Expanded groups state for nested categories
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Savings goals state
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])

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
      setBudgets(data.map(dbToUI))
      setLoading(false)
    } else {
      // No budgets found - seed defaults
      setLoading(false)
      await seedDefaultData()
    }
  }, [seedDefaultData])

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

  // Fetch expected income from paystubs for selected month
  // Smart logic: use selected month if available, otherwise use most recent month's data
  const fetchExpectedIncome = useCallback(async () => {
    const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)

    // First try to get paystubs for the selected month
    const { data: selectedMonthData, error: selectedError } = await supabase
      .from('paystubs')
      .select('net_pay, pay_date')
      .gte('pay_date', startOfMonth)
      .lte('pay_date', endOfMonth)

    if (selectedError) {
      console.error('Error fetching paystubs:', selectedError)
      return
    }

    if (selectedMonthData && selectedMonthData.length > 0) {
      const total = selectedMonthData.reduce((sum, p) => sum + Number(p.net_pay), 0)
      setExpectedIncome(total)
      return
    }

    // No data for selected month - fetch recent data to use as estimate
    const sixMonthsAgo = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 6, 1).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('paystubs')
      .select('net_pay, pay_date')
      .gte('pay_date', sixMonthsAgo)
      .order('pay_date', { ascending: false })

    if (error) {
      console.error('Error fetching paystubs:', error)
      return
    }

    if (!data || data.length === 0) {
      setExpectedIncome(0)
      return
    }

    // Group paystubs by month and use most recent
    const paysByMonth: Record<string, number> = {}
    data.forEach((p) => {
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
      setExpectedIncome(paysByMonth[sortedMonths[0]])
    } else {
      setExpectedIncome(0)
    }
  }, [selectedMonth])

  // Fetch on mount and when selected month changes
  useEffect(() => {
    fetchBudgets()
    fetchSavingsGoals()
    fetchExpectedIncome()
  }, [fetchBudgets, fetchSavingsGoals, fetchExpectedIncome, selectedMonth])

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

  const remainingToAllocate = expectedIncome - totalBudget
  const isOverBudget = remainingToAllocate < 0

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
        resetForm()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isDropdownOpen])

  const resetForm = () => {
    setNewCategoryName('')
    setSelectedIcon(availableIcons[0])
    setSelectedColor(availableColors[6])
    setNewBudget('')
    setSelectedType('need')
  }

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

  const handleCreateCategory = async () => {
    if (newCategoryName.trim() && userId) {
      // First, create the category in the categories table
      const newCategory = await createDbCategory({
        name: newCategoryName.trim(),
        icon: selectedIcon.name,
        color: selectedColor,
        category_type: selectedType,
        is_system: false,
        is_active: true,
      })

      if (!newCategory) {
        console.error('Failed to create category')
        return
      }

      // Then create the budget linked to the category
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          user_id: userId,
          category: newCategoryName.trim(),
          category_id: newCategory.id,
          monthly_limit: parseInt(newBudget) || 0,
          budget_type: selectedType,
          flexibility: 'variable',
          icon: selectedIcon.name,
          color: selectedColor,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating budget:', error)
      } else if (data) {
        setBudgets((prev) => [...prev, dbToUI(data)])
      }

      setIsDropdownOpen(false)
      resetForm()
    }
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
          <p className="text-[#1F1410]/60 text-lg">
            Allocate your monthly income to categories
          </p>
        </motion.div>

        {/* Month Selector */}
        <div className="flex justify-center mb-6">
          <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        </div>

        {/* Summary Card */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
            duration: 0.4,
          }}
          className="bg-white rounded-2xl p-6 shadow-sm mb-8"
          style={{
            boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#1F1410]/50 mb-1">
                Total Budget
              </span>
              <span className="text-3xl font-bold text-[#1F1410]">
                ${totalBudget.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#1F1410]/50 mb-1">
                Expected Income
              </span>
              <span className="text-3xl font-bold text-[#1F1410]">
                ${expectedIncome.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Left to Allocate with Needs/Wants breakdown */}
          <div className="border-t border-[#1F1410]/5 pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[#1F1410]/50">
                {isOverBudget ? 'Over Budget' : 'Left to Allocate'}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-2xl font-bold ${isOverBudget ? 'text-[#FF6B6B]' : 'text-[#10B981]'}`}
                >
                  {isOverBudget ? '-' : ''}$
                  {Math.abs(remainingToAllocate).toLocaleString()}
                </span>
                {isOverBudget ? (
                  <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                )}
              </div>
            </div>

            {/* Needs / Wants / Savings Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {/* Needs */}
              <div className="bg-[#10B981]/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-xs font-semibold text-[#10B981]">
                    Needs
                  </span>
                </div>
                <p className="text-xl font-bold text-[#1F1410]">
                  ${needsBudget.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#1F1410]/40 mt-0.5">
                  {expectedIncome > 0 ? Math.round((needsBudget / expectedIncome) * 100) : 0}% of income
                </p>
              </div>

              {/* Wants */}
              <div className="bg-[#A855F7]/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#A855F7]" />
                  <span className="text-xs font-semibold text-[#A855F7]">
                    Wants
                  </span>
                </div>
                <p className="text-xl font-bold text-[#1F1410]">
                  ${wantsBudget.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#1F1410]/40 mt-0.5">
                  {expectedIncome > 0 ? Math.round((wantsBudget / expectedIncome) * 100) : 0}% of income
                </p>
              </div>

              {/* Savings */}
              <div className="bg-[#38BDF8]/5 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <PiggyBank className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="text-xs font-semibold text-[#38BDF8]">
                    Savings
                  </span>
                </div>
                <p className="text-xl font-bold text-[#1F1410]">
                  ${savingsBudget.toLocaleString()}
                </p>
                <p className="text-[10px] text-[#1F1410]/40 mt-0.5">
                  {expectedIncome > 0 ? Math.round((savingsBudget / expectedIncome) * 100) : 0}% of income
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-3 bg-[#1F1410]/5 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${expectedIncome > 0 ? Math.min((needsBudget / expectedIncome) * 100, 100) : 0}%`,
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-[#10B981]"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${expectedIncome > 0 ? Math.min((wantsBudget / expectedIncome) * 100, 100) : 0}%`,
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  className="h-full bg-[#A855F7]"
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${expectedIncome > 0 ? Math.min((savingsBudget / expectedIncome) * 100, 100) : 0}%`,
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
                  className="h-full bg-[#38BDF8]"
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-[#1F1410]/40">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span>Needs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#A855F7]" />
                    <span>Wants</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                    <span>Savings</span>
                  </div>
                </div>
                <span>
                  {expectedIncome > 0 ? Math.round((totalBudget / expectedIncome) * 100) : 0}% allocated
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Categories List */}
        <div className="space-y-6">
          {/* Header with Add Button Dropdown */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1F1410]">Categories</h2>

            {/* Add Category Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                transition={{
                  delay: 0.3,
                }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isDropdownOpen
                    ? 'text-[#6366F1] bg-[#6366F1]/10'
                    : 'text-[#1F1410]/60 hover:text-[#6366F1] hover:bg-[#6366F1]/5'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
                <motion.div
                  animate={{
                    rotate: isDropdownOpen ? 180 : 0,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -8,
                      scale: 0.96,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                      scale: 0.96,
                    }}
                    transition={{
                      duration: 0.15,
                      ease: 'easeOut',
                    }}
                    className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl overflow-hidden w-72"
                    style={{
                      boxShadow: '0 4px 24px rgba(31, 20, 16, 0.12)',
                    }}
                  >
                    <div className="p-4">
                      <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-3">
                        New Category
                      </p>

                      {/* Category Name */}
                      <input
                        ref={inputRef}
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateCategory()
                          if (e.key === 'Escape') {
                            setIsDropdownOpen(false)
                            resetForm()
                          }
                        }}
                        placeholder="Category name"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all placeholder:text-[#1F1410]/30"
                      />

                      {/* Type Selection */}
                      <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                        Type
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedType('need')}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedType === 'need'
                              ? 'bg-[#10B981]/10 text-[#10B981] ring-2 ring-[#10B981]/20'
                              : 'bg-[#1F1410]/[0.03] text-[#1F1410]/60 hover:bg-[#1F1410]/[0.06]'
                          }`}
                        >
                          <Shield className="w-4 h-4" />
                          Need
                        </button>
                        <button
                          onClick={() => setSelectedType('want')}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedType === 'want'
                              ? 'bg-[#A855F7]/10 text-[#A855F7] ring-2 ring-[#A855F7]/20'
                              : 'bg-[#1F1410]/[0.03] text-[#1F1410]/60 hover:bg-[#1F1410]/[0.06]'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          Want
                        </button>
                      </div>

                      {/* Budget Amount */}
                      <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                        Monthly Budget
                      </p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 text-sm">
                          $
                        </span>
                        <input
                          type="text"
                          value={newBudget}
                          onChange={(e) =>
                            setNewBudget(e.target.value.replace(/[^0-9]/g, ''))
                          }
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all placeholder:text-[#1F1410]/30"
                        />
                      </div>

                      {/* Icon Selection */}
                      <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                        Icon
                      </p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {availableIcons.slice(0, 15).map(({ icon: Icon, name }) => (
                          <button
                            key={name}
                            onClick={() =>
                              setSelectedIcon({
                                icon: Icon,
                                name,
                              })
                            }
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={{
                              backgroundColor:
                                selectedIcon.name === name
                                  ? `${selectedColor}20`
                                  : 'rgba(31, 20, 16, 0.03)',
                              color:
                                selectedIcon.name === name
                                  ? selectedColor
                                  : 'rgba(31, 20, 16, 0.4)',
                            }}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>

                      {/* Color Selection */}
                      <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                        Color
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {availableColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className="w-7 h-7 rounded-full transition-transform"
                            style={{
                              backgroundColor: color,
                              transform:
                                selectedColor === color
                                  ? 'scale(1.15)'
                                  : 'scale(1)',
                              boxShadow:
                                selectedColor === color
                                  ? `0 0 0 2px white, 0 0 0 4px ${color}`
                                  : 'none',
                            }}
                          />
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false)
                            resetForm()
                          }}
                          className="flex-1 px-3 py-2 text-sm font-medium text-[#1F1410]/60 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateCategory}
                          disabled={!newCategoryName.trim()}
                          className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-40"
                          style={{
                            backgroundColor: selectedColor,
                          }}
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Needs Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1F1410]/5">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-[#10B981]" />
              </div>
              <h3 className="font-semibold text-[#1F1410]">Needs</h3>
              <span className="text-xs text-[#1F1410]/40 ml-auto">
                {needsCategories.length} categories
              </span>
            </div>
            <div className="space-y-1 divide-y divide-[#1F1410]/5">
              {needsGroups.map((group, index) => (
                <CategoryGroupRow
                  key={group.parent.id}
                  group={group}
                  startIndex={index}
                  onBudgetChange={handleBudgetChange}
                  expandedGroups={expandedGroups}
                  onToggleExpand={toggleExpandGroup}
                />
              ))}
              {needsGroups.length === 0 && (
                <p className="text-sm text-[#1F1410]/40 py-4 text-center">
                  No needs categories yet
                </p>
              )}
            </div>
          </motion.div>

          {/* Wants Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1F1410]/5">
              <div className="w-8 h-8 rounded-lg bg-[#A855F7]/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#A855F7]" />
              </div>
              <h3 className="font-semibold text-[#1F1410]">Wants</h3>
              <span className="text-xs text-[#1F1410]/40 ml-auto">
                {wantsCategories.length} categories
              </span>
            </div>
            <div className="space-y-1 divide-y divide-[#1F1410]/5">
              {wantsGroups.map((group, index) => (
                <CategoryGroupRow
                  key={group.parent.id}
                  group={group}
                  startIndex={index}
                  onBudgetChange={handleBudgetChange}
                  expandedGroups={expandedGroups}
                  onToggleExpand={toggleExpandGroup}
                />
              ))}
              {wantsGroups.length === 0 && (
                <p className="text-sm text-[#1F1410]/40 py-4 text-center">
                  No wants categories yet
                </p>
              )}
            </div>
          </motion.div>

          {/* Savings Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="bg-white rounded-2xl p-5 shadow-sm"
            style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
          >
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1F1410]/5">
              <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 flex items-center justify-center">
                <PiggyBank className="w-4 h-4 text-[#38BDF8]" />
              </div>
              <h3 className="font-semibold text-[#1F1410]">Savings Goals</h3>
              <span className="text-xs text-[#1F1410]/40 ml-auto">
                {savingsGoals.length} goals
              </span>
            </div>
            <div className="space-y-1 divide-y divide-[#1F1410]/5">
              {savingsGoals.map((goal, index) => (
                <SavingsGoalRow
                  key={goal.id}
                  goal={goal}
                  index={index}
                  onBudgetChange={handleSavingsBudgetChange}
                />
              ))}
              {savingsGoals.length === 0 && (
                <p className="text-sm text-[#1F1410]/40 py-4 text-center">
                  No savings goals yet. Create one on the Savings page.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
