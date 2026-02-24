import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Shield,
  Sparkles,
  Trash2,
  Pencil,
  Plus,
  Check,
  X,
} from 'lucide-react'
import { availableIcons, availableColors } from '../../lib/iconMap'
import type { CategoryBudget, CategoryGroup, SavingsGoal } from '../views/BudgetView'
import type { CategoryType } from '../../types/category'

// Inline icon + color picker shared by edit & subcategory forms
function IconColorPicker({
  selectedIcon,
  selectedColor,
  onIconChange,
  onColorChange,
}: {
  selectedIcon: string
  selectedColor: string
  onIconChange: (name: string) => void
  onColorChange: (color: string) => void
}) {
  return (
    <>
      {/* Icon grid */}
      <p className="text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-1">Icon</p>
      <div className="grid grid-cols-9 gap-1 max-h-20 overflow-y-auto mb-2">
        {availableIcons.map(({ icon: Ic, name }) => (
          <button
            key={name}
            type="button"
            onClick={() => onIconChange(name)}
            className="w-6 h-6 rounded flex items-center justify-center transition-all"
            style={{
              backgroundColor: selectedIcon === name ? `${selectedColor}20` : 'rgba(31, 20, 16, 0.03)',
              color: selectedIcon === name ? selectedColor : 'rgba(31, 20, 16, 0.4)',
            }}
          >
            <Ic className="w-3.5 h-3.5" />
          </button>
        ))}
      </div>
      {/* Color swatches */}
      <p className="text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-1">Color</p>
      <div className="flex gap-1 flex-wrap">
        {availableColors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onColorChange(color)}
            className="w-5 h-5 rounded-full transition-transform"
            style={{
              backgroundColor: color,
              transform: selectedColor === color ? 'scale(1.2)' : 'scale(1)',
              boxShadow: selectedColor === color ? `0 0 0 2px white, 0 0 0 3px ${color}` : 'none',
            }}
          />
        ))}
      </div>
    </>
  )
}

// CategoryRow component - compact row layout for stacked display
function CategoryRow({
  category,
  index,
  onBudgetChange,
  onDeleteCategory,
  onEditCategory,
  isChild = false,
}: {
  category: CategoryBudget
  index: number
  onBudgetChange: (id: string, value: string) => void
  onDeleteCategory?: (budgetId: string, categoryId: string | null, name: string) => void
  onEditCategory?: (budgetId: string, categoryId: string, updates: { name?: string; icon?: string; color?: string }) => void
  isChild?: boolean
}) {
  const Icon = category.icon
  const difference = category.budget - category.lastMonthSpent
  const isOverLastMonth = difference < 0

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(category.name)
  const [editIcon, setEditIcon] = useState(category.iconName)
  const [editColor, setEditColor] = useState(category.color)

  const handleSave = () => {
    if (!editName.trim() || !category.category_id || !onEditCategory) return
    const updates: { name?: string; icon?: string; color?: string } = {}
    if (editName.trim() !== category.name) updates.name = editName.trim()
    if (editIcon !== category.iconName) updates.icon = editIcon
    if (editColor !== category.color) updates.color = editColor
    if (Object.keys(updates).length > 0) {
      onEditCategory(category.id, category.category_id, updates)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setEditName(category.name)
    setEditIcon(category.iconName)
    setEditColor(category.color)
    setEditing(false)
  }

  return (
    <div>
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

        {/* Right section: Edit + Delete buttons + Budget input */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onEditCategory && category.category_id && (
            <button
              onClick={() => setEditing(!editing)}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#6366F1]/10"
            >
              <Pencil className="w-3.5 h-3.5 text-[#1F1410]/30 hover:text-[#6366F1] transition-colors" />
            </button>
          )}
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

      {/* Inline edit form */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`bg-[#1F1410]/[0.02] rounded-lg p-3 mb-2 ${isChild ? 'ml-6' : ''}`}>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
                className="w-full px-2 py-1.5 text-sm rounded border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 mb-2"
                placeholder="Category name"
              />
              <IconColorPicker
                selectedIcon={editIcon}
                selectedColor={editColor}
                onIconChange={setEditIcon}
                onColorChange={setEditColor}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1F1410]/60 rounded hover:bg-[#1F1410]/5 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editName.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white rounded transition-all disabled:opacity-40"
                  style={{ backgroundColor: editColor }}
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Inline subcategory creation form
function AddSubcategoryForm({
  parentColor,
  parentType,
  onSave,
  onCancel,
}: {
  parentColor: string
  parentType: CategoryType
  onSave: (data: { name: string; icon: string; color: string; budget: string; type: CategoryType }) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(availableIcons[0].name)
  const [color, setColor] = useState(parentColor)
  const [budget, setBudget] = useState('')

  const handleSubmit = () => {
    if (!name.trim()) return
    onSave({ name: name.trim(), icon, color, budget, type: parentType })
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="bg-[#1F1410]/[0.02] rounded-lg p-3 ml-7 mb-1 border border-dashed border-[#1F1410]/10">
        <p className="text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-2">New Subcategory</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onCancel() }}
            className="flex-1 px-2 py-1.5 text-sm rounded border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10"
            placeholder="Subcategory name"
            autoFocus
          />
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#1F1410]/40 text-xs">$</span>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="0"
              className="w-20 pl-5 pr-2 py-1.5 text-sm text-right rounded border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10"
            />
          </div>
        </div>
        <IconColorPicker
          selectedIcon={icon}
          selectedColor={color}
          onIconChange={setIcon}
          onColorChange={setColor}
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1F1410]/60 rounded hover:bg-[#1F1410]/5 transition-colors"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white rounded transition-all disabled:opacity-40"
            style={{ backgroundColor: color }}
          >
            <Check className="w-3 h-3" />
            Add
          </button>
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
  onEditCategory,
  onAddSubcategory,
  expandedGroups,
  onToggleExpand,
}: {
  group: CategoryGroup
  startIndex: number
  onBudgetChange: (id: string, value: string) => void
  onDeleteCategory?: (budgetId: string, categoryId: string | null, name: string, childBudgetIds?: string[], childCategoryIds?: string[]) => void
  onEditCategory?: (budgetId: string, categoryId: string, updates: { name?: string; icon?: string; color?: string }) => void
  onAddSubcategory?: (parentCategoryId: string, data: { name: string; icon: string; color: string; budget: string; type: CategoryType }) => void
  expandedGroups: Set<string>
  onToggleExpand: (id: string) => void
}) {
  const Icon = group.parent.icon
  const hasChildren = group.children.length > 0
  const isExpanded = expandedGroups.has(group.parent.id)

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(group.parent.name)
  const [editIcon, setEditIcon] = useState(group.parent.iconName)
  const [editColor, setEditColor] = useState(group.parent.color)
  const [showAddSub, setShowAddSub] = useState(false)

  // Calculate totals for parent row
  const parentBudget = group.parent.budget
  const childrenBudget = group.children.reduce((sum, c) => sum + c.budget, 0)
  const totalBudget = parentBudget + childrenBudget
  const parentLastMonth = group.parent.lastMonthSpent
  const childrenLastMonth = group.children.reduce((sum, c) => sum + c.lastMonthSpent, 0)
  const totalLastMonth = parentLastMonth + childrenLastMonth
  const difference = totalBudget - totalLastMonth
  const isOverLastMonth = difference < 0

  const handleSave = () => {
    if (!editName.trim() || !group.parent.category_id || !onEditCategory) return
    const updates: { name?: string; icon?: string; color?: string } = {}
    if (editName.trim() !== group.parent.name) updates.name = editName.trim()
    if (editIcon !== group.parent.iconName) updates.icon = editIcon
    if (editColor !== group.parent.color) updates.color = editColor
    if (Object.keys(updates).length > 0) {
      onEditCategory(group.parent.id, group.parent.category_id, updates)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setEditName(group.parent.name)
    setEditIcon(group.parent.iconName)
    setEditColor(group.parent.color)
    setEditing(false)
  }

  const handleAddSubcategory = (data: { name: string; icon: string; color: string; budget: string; type: CategoryType }) => {
    if (!group.parent.category_id || !onAddSubcategory) return
    onAddSubcategory(group.parent.category_id, data)
    setShowAddSub(false)
  }

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

        {/* Right section: Add Sub + Edit + Delete + Total budget display or input */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onAddSubcategory && group.parent.category_id && (
            <button
              onClick={() => {
                setShowAddSub(!showAddSub)
                if (!isExpanded && hasChildren) onToggleExpand(group.parent.id)
              }}
              className="opacity-0 group-hover/parent:opacity-100 transition-opacity p-1 rounded hover:bg-[#10B981]/10"
            >
              <Plus className="w-3.5 h-3.5 text-[#1F1410]/30 hover:text-[#10B981] transition-colors" />
            </button>
          )}
          {onEditCategory && group.parent.category_id && (
            <button
              onClick={() => setEditing(!editing)}
              className="opacity-0 group-hover/parent:opacity-100 transition-opacity p-1 rounded hover:bg-[#6366F1]/10"
            >
              <Pencil className="w-3.5 h-3.5 text-[#1F1410]/30 hover:text-[#6366F1] transition-colors" />
            </button>
          )}
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

      {/* Inline edit form for parent */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-[#1F1410]/[0.02] rounded-lg p-3 ml-7 mb-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
                className="w-full px-2 py-1.5 text-sm rounded border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 mb-2"
                placeholder="Category name"
              />
              <IconColorPicker
                selectedIcon={editIcon}
                selectedColor={editColor}
                onIconChange={setEditIcon}
                onColorChange={setEditColor}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1F1410]/60 rounded hover:bg-[#1F1410]/5 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!editName.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white rounded transition-all disabled:opacity-40"
                  style={{ backgroundColor: editColor }}
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add subcategory form (above children) */}
      <AnimatePresence>
        {showAddSub && (
          <AddSubcategoryForm
            parentColor={group.parent.color}
            parentType={group.parent.type}
            onSave={handleAddSubcategory}
            onCancel={() => setShowAddSub(false)}
          />
        )}
      </AnimatePresence>

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
                  onEditCategory={onEditCategory}
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
// --- Exported section components ---

export type BudgetCategorySectionProps = {
  type: 'needs' | 'wants'
  groups: CategoryGroup[]
  categoryCount: number
  onBudgetChange: (id: string, value: string) => void
  onDeleteCategory?: (budgetId: string, categoryId: string | null, name: string, childBudgetIds?: string[], childCategoryIds?: string[]) => void
  onEditCategory?: (budgetId: string, categoryId: string, updates: { name?: string; icon?: string; color?: string }) => void
  onAddSubcategory?: (parentCategoryId: string, data: { name: string; icon: string; color: string; budget: string; type: CategoryType }) => void
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
  onEditCategory,
  onAddSubcategory,
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
            onEditCategory={onEditCategory}
            onAddSubcategory={onAddSubcategory}
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
      className="bg-white rounded-2xl overflow-hidden border border-[#1F1410]/5"
    >
      {/* Table header — matches category table grid: [24px_32px_1fr_1fr_80px_80px_100px_56px] */}
      <div className="grid grid-cols-[24px_32px_1fr_1fr_80px_80px_100px_56px] gap-2 px-4 py-3 border-b border-[#1F1410]/5 text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wide">
        <div />
        <div />
        <div>Goal</div>
        <div>Deadline</div>
        <div>Progress</div>
        <div />
        <div className="text-right">Monthly</div>
        <div />
      </div>

      {/* Table rows */}
      <div className="divide-y divide-[#1F1410]/5">
        {savingsGoals.map((goal, index) => {
          const Icon = goal.icon
          const deadlineStr = goal.deadline
            ? goal.deadline.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : '—'

          return (
            <motion.div
              key={goal.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
              className="group grid grid-cols-[24px_32px_1fr_1fr_80px_80px_100px_56px] gap-2 px-4 py-2 items-center hover:bg-[#1F1410]/[0.015] transition-colors"
            >
              {/* Spacer (matches drag handle column) */}
              <div />
              {/* Icon */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${goal.color}15` }}
              >
                <Icon className="w-4 h-4" style={{ color: goal.color }} />
              </div>

              {/* Name + current/target */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1F1410] truncate">{goal.name}</p>
                <p className="text-xs text-[#1F1410]/40">
                  ${goal.currentAmount.toLocaleString()} of ${goal.targetAmount.toLocaleString()}
                </p>
              </div>

              {/* Deadline (aligned with Parent column) */}
              <div className="text-xs text-[#1F1410]/40 font-medium">
                {deadlineStr}
              </div>

              {/* Progress (aligned with Type column) */}
              <div className="text-xs font-medium text-[#1F1410]/60">
                {Math.round(goal.progress)}%
              </div>

              {/* Spacer (aligned with Last Mo. column) */}
              <div />

              {/* Monthly budget input (aligned with Budget column) */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 text-sm font-medium">
                  $
                </span>
                <input
                  type="text"
                  value={goal.monthlyBudget}
                  onChange={(e) => onBudgetChange(goal.id, e.target.value)}
                  className="w-full pl-6 pr-2 py-1 text-right font-semibold text-[#1F1410] bg-[#1F1410]/[0.03] rounded-lg focus:bg-white focus:ring-2 focus:ring-[#38BDF8]/20 focus:outline-none transition-all text-sm"
                />
              </div>

              {/* Actions spacer (matches category table) */}
              <div />
            </motion.div>
          )
        })}
      </div>

      {savingsGoals.length === 0 && (
        <p className="text-sm text-[#1F1410]/40 py-8 text-center">
          No savings goals yet. Create one on the Savings page.
        </p>
      )}
    </motion.div>
  )
}
