import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LucideIcon, ChevronDown, X } from 'lucide-react'

type CategoryWithBudget = {
  id: string
  icon: LucideIcon
  name: string
  total: number
  budget: number
  color: string
  category_type?: string
  parent_id?: string | null
}

type CategoryProgressListProps = {
  categories: CategoryWithBudget[]
  selectedCategoryId?: string | null
  onCategorySelect?: (categoryId: string | null) => void
}

type ParentGroup = {
  parent: CategoryWithBudget
  children: CategoryWithBudget[]
}

type CategoryGroupProps = {
  parent: CategoryWithBudget
  children: CategoryWithBudget[]
  defaultExpanded?: boolean
  selectedCategoryId?: string | null
  onCategorySelect?: (categoryId: string | null) => void
}

function CategoryGroup({ parent, children, defaultExpanded = true, selectedCategoryId, onCategorySelect }: CategoryGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const isParentSelected = selectedCategoryId === parent.id

  // Filter children to only those with activity (for consistent counting and rendering)
  const activeChildren = useMemo(() =>
    children.filter(child => child.total > 0 || child.budget > 0),
    [children]
  )

  // Calculate totals - when parent has children, use only children totals
  // (parent categories with children act as containers, not budget items)
  const hasActiveChildren = activeChildren.length > 0

  const groupTotal = useMemo(() =>
    hasActiveChildren
      ? activeChildren.reduce((sum, cat) => sum + cat.total, 0)
      : parent.total,
    [hasActiveChildren, activeChildren, parent.total]
  )

  const groupBudget = useMemo(() =>
    hasActiveChildren
      ? activeChildren.reduce((sum, cat) => sum + cat.budget, 0)
      : parent.budget,
    [hasActiveChildren, activeChildren, parent.budget]
  )

  const groupPercentage = groupBudget > 0 ? (groupTotal / groupBudget) * 100 : 0
  const isOverBudget = groupBudget > 0 && groupTotal > groupBudget

  // Don't render if no spending or budget in group
  if (groupTotal === 0 && groupBudget === 0) return null

  const ParentIcon = parent.icon

  return (
    <div className="mb-4">
      {/* Group Header - Parent Category */}
      <div
        className="w-full flex items-center justify-between p-3 rounded-xl transition-all"
        style={isParentSelected ? { backgroundColor: `${parent.color}08`, boxShadow: `inset 0 0 0 2px ${parent.color}40` } : undefined}
      >
        {/* Left side: Icon + Name - clickable for filtering */}
        <div
          className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onCategorySelect?.(isParentSelected ? null : parent.id)}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${parent.color}15` }}
          >
            <ParentIcon className="w-4 h-4" style={{ color: parent.color }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-[#1F1410]">{parent.name}</p>
            {hasActiveChildren && (
              <p className="text-xs text-[#1F1410]/40">
                {activeChildren.length} {activeChildren.length === 1 ? 'subcategory' : 'subcategories'}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-[#1F1410]">
              ${groupTotal.toLocaleString()}
              {groupBudget > 0 && (
                <span
                  className="text-xs font-medium ml-2"
                  style={{ color: isOverBudget ? '#FF6B6B' : parent.color }}
                >
                  {Math.round(groupPercentage)}%
                </span>
              )}
            </p>
            {groupBudget > 0 && (
              <p className="text-xs text-[#1F1410]/40">of ${groupBudget.toLocaleString()}</p>
            )}
          </div>
          {/* Chevron button - separate click target for expand/collapse */}
          {hasActiveChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="p-1 -m-1 rounded-md hover:bg-[#1F1410]/5 transition-colors"
              aria-label={isExpanded ? 'Collapse subcategories' : 'Expand subcategories'}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-5 h-5 text-[#1F1410]/40 hover:text-[#1F1410]/60 transition-colors" />
              </motion.div>
            </button>
          )}
        </div>
      </div>

      {/* Group remaining amount */}

      {/* Child Categories List */}
      <AnimatePresence initial={false}>
        {isExpanded && activeChildren.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pl-4 pr-1 space-y-3 pt-2 mx-2">
              {activeChildren.map((category, index) => {
                const IconComponent = category.icon
                const percentage = category.budget > 0
                  ? (category.total / category.budget) * 100
                  : 0
                const isCategoryOverBudget = category.budget > 0 && category.total > category.budget
                const remaining = category.budget - category.total
                const displayColor = isCategoryOverBudget ? '#FF6B6B' : category.color

                const isSelected = selectedCategoryId === category.id

                return (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + index * 0.03, duration: 0.2 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onCategorySelect) {
                        onCategorySelect(isSelected ? null : category.id)
                      }
                    }}
                    className={`group cursor-pointer p-2 -mx-2 rounded-lg transition-all ${
                      isSelected ? '' : 'hover:bg-[#1F1410]/3'
                    }`}
                    style={isSelected ? { backgroundColor: `${category.color}08`, boxShadow: `inset 0 0 0 2px ${category.color}40` } : undefined}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      {/* Left section: Icon + Category info */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${category.color}15` }}
                        >
                          <IconComponent className="w-3.5 h-3.5" style={{ color: category.color }} />
                        </motion.div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#1F1410] truncate group-hover:text-[#1F1410]/80 transition-colors">
                            {category.name}
                          </p>
                          <p className="text-xs text-[#1F1410]/40">
                            {category.budget > 0 ? (
                              isCategoryOverBudget ? (
                                <span className="text-[#FF6B6B]">
                                  ${Math.abs(remaining).toLocaleString()} over
                                </span>
                              ) : (
                                <span>${remaining.toLocaleString()} left</span>
                              )
                            ) : (
                              <span>No budget</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Right section: Amount + Percentage */}
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className="flex items-baseline gap-1.5 justify-end">
                          <span className="text-sm font-bold text-[#1F1410]">
                            ${category.total.toLocaleString()}
                          </span>
                          {category.budget > 0 && (
                            <span
                              className="text-xs font-medium"
                              style={{ color: displayColor }}
                            >
                              {Math.round(percentage)}%
                            </span>
                          )}
                        </div>
                        {category.budget > 0 && (
                          <p className="text-[10px] text-[#1F1410]/40">
                            of ${category.budget.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>


                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function CategoryProgressList({ categories, selectedCategoryId, onCategorySelect }: CategoryProgressListProps) {
  // Organize categories into parent-child hierarchy
  const parentGroups = useMemo((): ParentGroup[] => {
    // Separate parents (no parent_id) and children (has parent_id)
    const parents = categories.filter(cat => !cat.parent_id)
    const children = categories.filter(cat => cat.parent_id)

    // Build a map of parent_id to children
    const childMap = new Map<string, CategoryWithBudget[]>()
    children.forEach(child => {
      if (child.parent_id) {
        const existing = childMap.get(child.parent_id) || []
        existing.push(child)
        childMap.set(child.parent_id, existing)
      }
    })

    // Create groups, filtering to only those with activity
    return parents
      .map(parent => ({
        parent,
        children: childMap.get(parent.id) || [],
      }))
      .filter(group => {
        // Keep group if parent or any child has spending or budget
        const hasParentActivity = group.parent.total > 0 || group.parent.budget > 0
        const hasChildActivity = group.children.some(c => c.total > 0 || c.budget > 0)
        return hasParentActivity || hasChildActivity
      })
  }, [categories])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white rounded-2xl p-5 border border-[#1F1410]/5"
    >
      {/* Clear Filter Button */}
      {selectedCategoryId && onCategorySelect && (
        <button
          onClick={() => onCategorySelect(null)}
          className="w-full flex items-center justify-center gap-2 mb-4 py-2 px-3 rounded-lg text-sm font-medium text-[#1F1410]/70 hover:text-[#1F1410] bg-[#1F1410]/5 hover:bg-[#1F1410]/10 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear filter
        </button>
      )}

      {parentGroups.length === 0 ? (
        <p className="text-sm text-[#1F1410]/40 text-center py-4">
          No spending recorded yet
        </p>
      ) : (
        parentGroups.map((group) => (
          <CategoryGroup
            key={group.parent.id}
            parent={group.parent}
            children={group.children}
            defaultExpanded={true}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={onCategorySelect}
          />
        ))
      )}
    </motion.div>
  )
}
