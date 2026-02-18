import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Shield,
  Sparkles,
  PiggyBank,
  Trash2,
} from 'lucide-react'
import type { CategoryBudget, CategoryGroup, SavingsGoal } from '../views/BudgetView'

// CategoryRow component - compact row layout for stacked display
function CategoryRow({
  category,
  index,
  onBudgetChange,
  onDeleteCategory,
  isChild = false,
}: {
  category: CategoryBudget
  index: number
  onBudgetChange: (id: string, value: string) => void
  onDeleteCategory?: (budgetId: string, categoryId: string | null, name: string) => void
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
      className={`group flex items-center justify-between py-2 ${isChild ? 'pl-6' : ''}`}
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

      {/* Right section: Delete button + Budget input */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {onDeleteCategory && (
          <button
            onClick={() => onDeleteCategory(category.id, category.category_id, category.name)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 text-[#1F1410]/30 hover:text-red-500 transition-colors" />
          </button>
        )}
        <div className="relative">
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
      </div>
    </motion.div>
  )
}

// CategoryGroupRow component - parent with collapsible children
function CategoryGroupRow({
  group,
  startIndex,
  onBudgetChange,
  onDeleteCategory,
  expandedGroups,
  onToggleExpand,
}: {
  group: CategoryGroup
  startIndex: number
  onBudgetChange: (id: string, value: string) => void
  onDeleteCategory?: (budgetId: string, categoryId: string | null, name: string, childBudgetIds?: string[], childCategoryIds?: string[]) => void
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
        className="group/parent flex items-center justify-between py-2"
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

        {/* Right section: Delete button + Total budget display or input */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onDeleteCategory && (
            <button
              onClick={() => {
                const childBudgetIds = hasChildren ? group.children.map(c => c.id) : undefined
                const childCategoryIds = hasChildren ? group.children.map(c => c.category_id).filter((id): id is string => id !== null) : undefined
                onDeleteCategory(group.parent.id, group.parent.category_id, group.parent.name, childBudgetIds, childCategoryIds)
              }}
              className="opacity-0 group-hover/parent:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 text-[#1F1410]/30 hover:text-red-500 transition-colors" />
            </button>
          )}
          <div className="relative">
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
                  onDeleteCategory={onDeleteCategory ? (budgetId, categoryId, name) => onDeleteCategory(budgetId, categoryId, name) : undefined}
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

// --- Exported section components ---

export type BudgetCategorySectionProps = {
  type: 'needs' | 'wants'
  groups: CategoryGroup[]
  categoryCount: number
  onBudgetChange: (id: string, value: string) => void
  onDeleteCategory?: (budgetId: string, categoryId: string | null, name: string, childBudgetIds?: string[], childCategoryIds?: string[]) => void
  expandedGroups: Set<string>
  onToggleExpand: (id: string) => void
  animationDelay?: number
}

const sectionConfig = {
  needs: {
    label: 'Needs',
    icon: Shield,
    color: '#10B981',
    emptyMessage: 'No needs categories yet',
  },
  wants: {
    label: 'Wants',
    icon: Sparkles,
    color: '#A855F7',
    emptyMessage: 'No wants categories yet',
  },
} as const

export function BudgetCategorySection({
  type,
  groups,
  categoryCount,
  onBudgetChange,
  onDeleteCategory,
  expandedGroups,
  onToggleExpand,
  animationDelay = 0.3,
}: BudgetCategorySectionProps) {
  const config = sectionConfig[type]
  const SectionIcon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.4 }}
      className="bg-white rounded-2xl p-5 shadow-sm"
      style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
    >
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1F1410]/5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${config.color}1A` }}
        >
          <SectionIcon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <h3 className="font-semibold text-[#1F1410]">{config.label}</h3>
        <span className="text-xs text-[#1F1410]/40 ml-auto">
          {categoryCount} categories
        </span>
      </div>
      <div className="space-y-1 divide-y divide-[#1F1410]/5">
        {groups.map((group, index) => (
          <CategoryGroupRow
            key={group.parent.id}
            group={group}
            startIndex={index}
            onBudgetChange={onBudgetChange}
            onDeleteCategory={onDeleteCategory}
            expandedGroups={expandedGroups}
            onToggleExpand={onToggleExpand}
          />
        ))}
        {groups.length === 0 && (
          <p className="text-sm text-[#1F1410]/40 py-4 text-center">
            {config.emptyMessage}
          </p>
        )}
      </div>
    </motion.div>
  )
}

export type SavingsGoalsSectionProps = {
  savingsGoals: SavingsGoal[]
  onBudgetChange: (id: string, value: string) => void
  animationDelay?: number
}

export function SavingsGoalsSection({
  savingsGoals,
  onBudgetChange,
  animationDelay = 0.5,
}: SavingsGoalsSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay, duration: 0.4 }}
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
            onBudgetChange={onBudgetChange}
          />
        ))}
        {savingsGoals.length === 0 && (
          <p className="text-sm text-[#1F1410]/40 py-4 text-center">
            No savings goals yet. Create one on the Savings page.
          </p>
        )}
      </div>
    </motion.div>
  )
}
