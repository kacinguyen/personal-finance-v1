import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Pencil,
  Trash2,
  Check,
  X,
  Shield,
  Sparkles,
  TrendingUp,
  ArrowLeftRight,
  PiggyBank,
  ChevronDown,
  GripVertical,
  type LucideIcon,
} from 'lucide-react'
import { availableIcons, availableColors } from '../../lib/iconMap'
import type { CategoryBudget } from '../views/BudgetView'
import type { CategoryType } from '../../types/category'

// Type config for pills (display) and dropdown
const TYPE_CONFIG: {
  type: CategoryType
  label: string
  color: string
  icon: LucideIcon
}[] = [
  { type: 'need', label: 'Need', color: '#10B981', icon: Shield },
  { type: 'want', label: 'Want', color: '#A855F7', icon: Sparkles },
  { type: 'income', label: 'Income', color: '#10B981', icon: TrendingUp },
  { type: 'savings_funded', label: 'Savings', color: '#38BDF8', icon: PiggyBank },
  { type: 'transfer', label: 'Transfer', color: '#8B5CF6', icon: ArrowLeftRight },
]

// Only Need and Want are selectable in the type dropdown
const SELECTABLE_TYPES = TYPE_CONFIG.filter(t => t.type === 'need' || t.type === 'want')

function getTypeConfig(type: CategoryType) {
  return TYPE_CONFIG.find(t => t.type === type) ?? TYPE_CONFIG[0]
}

// --- Type Pill with dropdown ---
function TypePill({
  type,
  onChange,
}: {
  type: CategoryType
  onChange: (newType: CategoryType) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const config = getTypeConfig(type)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
        style={{
          backgroundColor: `${config.color}15`,
          color: config.color,
        }}
      >
        {config.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg overflow-hidden py-1 min-w-[130px]"
            style={{ boxShadow: '0 4px 16px rgba(31, 20, 16, 0.12)' }}
          >
            {SELECTABLE_TYPES.map(({ type: t, label, color, icon: Icon }) => (
              <button
                key={t}
                onClick={() => {
                  onChange(t)
                  setOpen(false)
                }}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  t === type ? 'bg-[#1F1410]/[0.04]' : 'hover:bg-[#1F1410]/[0.03]'
                }`}
                style={{ color }}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {t === type && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Parent dropdown ---
function ParentDropdown({
  currentParentId,
  categoryId,
  budgets,
  onSetParent,
}: {
  currentParentId: string | null
  categoryId: string | null
  budgets: CategoryBudget[]
  onSetParent: (categoryId: string, parentId: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  if (!categoryId) {
    return <span className="text-xs text-[#1F1410]/40">—</span>
  }

  // Get children of this category (to exclude from potential parents)
  const childIds = new Set(
    budgets.filter(b => b.parent_id === categoryId).map(b => b.category_id)
  )

  // Potential parents: other categories that aren't self, aren't children, and aren't already children of something
  const potentialParents = budgets.filter(b =>
    b.category_id &&
    b.category_id !== categoryId &&
    !childIds.has(b.category_id) &&
    !b.parent_id // only top-level categories can be parents
  )

  const parentName = currentParentId
    ? budgets.find(b => b.category_id === currentParentId)?.name ?? '—'
    : '—'

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-[#1F1410]/40 hover:text-[#1F1410]/60 transition-colors truncate"
      >
        <span className="truncate">{parentName}</span>
        <ChevronDown className="w-3 h-3 flex-shrink-0" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1 z-50 bg-white rounded-lg overflow-hidden py-1 min-w-[160px] max-h-48 overflow-y-auto"
            style={{ boxShadow: '0 4px 16px rgba(31, 20, 16, 0.12)' }}
          >
            {/* None option */}
            <button
              onClick={() => {
                onSetParent(categoryId, null)
                setOpen(false)
              }}
              className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !currentParentId ? 'bg-[#1F1410]/[0.04]' : 'hover:bg-[#1F1410]/[0.03]'
              } text-[#1F1410]/60`}
            >
              None
              {!currentParentId && <Check className="w-3 h-3 ml-auto" />}
            </button>
            {potentialParents.map(p => {
              const Icon = p.icon
              return (
                <button
                  key={p.category_id}
                  onClick={() => {
                    onSetParent(categoryId, p.category_id)
                    setOpen(false)
                  }}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    currentParentId === p.category_id ? 'bg-[#1F1410]/[0.04]' : 'hover:bg-[#1F1410]/[0.03]'
                  } text-[#1F1410]`}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: p.color }} />
                  {p.name}
                  {currentParentId === p.category_id && <Check className="w-3 h-3 ml-auto text-[#6366F1]" />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Inline name editor ---
function InlineName({
  name,
  onSave,
  isChild,
}: {
  name: string
  onSave: (newName: string) => void
  isChild: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  // Sync if parent changes name externally
  useEffect(() => {
    if (!editing) setValue(name)
  }, [name, editing])

  const handleSave = () => {
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) {
      onSave(trimmed)
    } else {
      setValue(name)
    }
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') { setValue(name); setEditing(false) }
        }}
        onBlur={handleSave}
        className={`bg-white border border-[#6366F1]/30 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 ${
          isChild ? 'text-sm' : 'text-sm font-semibold'
        }`}
        style={{ width: Math.max(80, value.length * 8 + 24) }}
      />
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={`text-left truncate hover:underline hover:decoration-[#1F1410]/20 cursor-text ${
        isChild ? 'text-sm text-[#1F1410]' : 'text-sm font-semibold text-[#1F1410]'
      }`}
    >
      {name}
    </button>
  )
}

// --- Icon/Color popover ---
function IconColorPopover({
  iconName,
  color,
  onSave,
  onClose,
}: {
  iconName: string
  color: string
  onSave: (updates: { icon?: string; color?: string }) => void
  onClose: () => void
}) {
  const [selectedIcon, setSelectedIcon] = useState(iconName)
  const [selectedColor, setSelectedColor] = useState(color)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleSave = () => {
    const updates: { icon?: string; color?: string } = {}
    if (selectedIcon !== iconName) updates.icon = selectedIcon
    if (selectedColor !== color) updates.color = selectedColor
    if (Object.keys(updates).length > 0) onSave(updates)
    onClose()
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.96 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl p-3 w-64"
      style={{ boxShadow: '0 4px 24px rgba(31, 20, 16, 0.12)' }}
    >
      {/* Icon grid */}
      <p className="text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-1">Icon</p>
      <div className="grid grid-cols-9 gap-1 max-h-20 overflow-y-auto mb-2">
        {availableIcons.map(({ icon: Ic, name }) => (
          <button
            key={name}
            type="button"
            onClick={() => setSelectedIcon(name)}
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
      <div className="flex gap-1 flex-wrap mb-2">
        {availableColors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setSelectedColor(c)}
            className="w-5 h-5 rounded-full transition-transform"
            style={{
              backgroundColor: c,
              transform: selectedColor === c ? 'scale(1.2)' : 'scale(1)',
              boxShadow: selectedColor === c ? `0 0 0 2px white, 0 0 0 3px ${c}` : 'none',
            }}
          />
        ))}
      </div>
      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#1F1410]/60 rounded hover:bg-[#1F1410]/5 transition-colors"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white rounded transition-all"
          style={{ backgroundColor: selectedColor }}
        >
          <Check className="w-3 h-3" />
          Save
        </button>
      </div>
    </motion.div>
  )
}

// --- Table Row ---
function TableRow({
  row,
  index,
  isChild,
  budgets,
  parentChildSums,
  editingIconId,
  setEditingIconId,
  onBudgetChange,
  onDeleteCategory,
  onEditCategory,
  onSetParent,
  onDragStart,
  onDragEnter,
  isDragging,
  isDragOver,
}: {
  row: CategoryBudget
  index: number
  isChild: boolean
  budgets: CategoryBudget[]
  parentChildSums: Map<string, number>
  editingIconId: string | null
  setEditingIconId: (id: string | null) => void
  onBudgetChange: (id: string, value: string) => void
  onDeleteCategory: (budgetId: string, categoryId: string | null, name: string) => void
  onEditCategory: (
    budgetId: string,
    categoryId: string,
    updates: { name?: string; icon?: string; color?: string; category_type?: CategoryType },
  ) => void
  onSetParent: (categoryId: string, parentId: string | null) => void
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  isDragging: boolean
  isDragOver: boolean
}) {
  const Icon = row.icon

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isDragging ? 0.5 : 1 }}
      transition={{ duration: 0.2 }}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragOver={e => e.preventDefault()}
      className={`group grid grid-cols-[24px_32px_1fr_1fr_80px_80px_100px_56px] gap-2 px-4 py-2 items-center hover:bg-[#1F1410]/[0.015] transition-colors bg-white ${
        isDragOver ? 'border-t-2 border-[#6366F1]/40' : ''
      }`}
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <GripVertical className="w-4 h-4 text-[#1F1410]/20" />
      </div>

      {/* Icon */}
      <div
        className={`rounded-lg flex items-center justify-center flex-shrink-0 ${
          isChild ? 'w-7 h-7' : 'w-8 h-8'
        }`}
        style={{ backgroundColor: `${row.color}15` }}
      >
        <Icon
          className={isChild ? 'w-3.5 h-3.5' : 'w-4 h-4'}
          style={{ color: row.color }}
        />
      </div>

      {/* Name (inline editable) */}
      <div className={`min-w-0 ${isChild ? 'pl-4' : ''}`}>
        {row.category_id ? (
          <InlineName
            name={row.name}
            isChild={isChild}
            onSave={newName =>
              onEditCategory(row.id, row.category_id!, { name: newName })
            }
          />
        ) : (
          <span className={`truncate ${isChild ? 'text-sm' : 'text-sm font-semibold'} text-[#1F1410]`}>
            {row.name}
          </span>
        )}
      </div>

      {/* Parent dropdown */}
      <div>
        <ParentDropdown
          currentParentId={row.parent_id}
          categoryId={row.category_id}
          budgets={budgets}
          onSetParent={onSetParent}
        />
      </div>

      {/* Type pill */}
      <div>
        {row.category_id ? (
          <TypePill
            type={row.type}
            onChange={newType =>
              onEditCategory(row.id, row.category_id!, { category_type: newType })
            }
          />
        ) : (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${getTypeConfig(row.type).color}15`,
              color: getTypeConfig(row.type).color,
            }}
          >
            {getTypeConfig(row.type).label}
          </span>
        )}
      </div>

      {/* Last Month column */}
      <div className="text-right text-xs text-[#1F1410]/30 font-medium tabular-nums">
        {row.lastMonthBudget > 0 ? `$${row.lastMonthBudget.toLocaleString()}` : '—'}
      </div>

      {/* Budget input or read-only sum for parents */}
      <div className="relative">
        {row.category_id && parentChildSums.has(row.category_id) ? (
          <div className="w-full px-2 py-1 text-right font-semibold text-[#1F1410]/60 text-sm">
            ${parentChildSums.get(row.category_id)!.toLocaleString()}
          </div>
        ) : (
          <>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 text-sm font-medium">
              $
            </span>
            <input
              type="text"
              value={row.budget}
              onChange={e => onBudgetChange(row.id, e.target.value)}
              className="w-full pl-6 pr-2 py-1 text-right font-semibold text-[#1F1410] bg-[#1F1410]/[0.03] rounded-lg focus:bg-white focus:ring-2 focus:ring-[#6366F1]/20 focus:outline-none transition-all text-sm"
            />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="relative flex items-center justify-end gap-1">
        {row.category_id && (
          <button
            onClick={() =>
              setEditingIconId(editingIconId === row.id ? null : row.id)
            }
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#6366F1]/10"
          >
            <Pencil className="w-3.5 h-3.5 text-[#1F1410]/30 hover:text-[#6366F1] transition-colors" />
          </button>
        )}
        <button
          onClick={() => onDeleteCategory(row.id, row.category_id, row.name)}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5 text-[#1F1410]/30 hover:text-red-500 transition-colors" />
        </button>

        {/* Icon/Color popover */}
        <AnimatePresence>
          {editingIconId === row.id && row.category_id && (
            <IconColorPopover
              iconName={row.iconName}
              color={row.color}
              onSave={updates =>
                onEditCategory(row.id, row.category_id!, updates)
              }
              onClose={() => setEditingIconId(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

// --- Props ---
export type BudgetCategoryTableProps = {
  budgets: CategoryBudget[]
  onBudgetChange: (id: string, value: string) => void
  onDeleteCategory: (budgetId: string, categoryId: string | null, name: string) => void
  onEditCategory: (
    budgetId: string,
    categoryId: string,
    updates: { name?: string; icon?: string; color?: string; category_type?: CategoryType },
  ) => void
  onReorder: (orderedBudgets: CategoryBudget[]) => void
  onSetParent: (categoryId: string, parentId: string | null) => void
}

export function BudgetCategoryTable({
  budgets,
  onBudgetChange,
  onDeleteCategory,
  onEditCategory,
  onReorder,
  onSetParent,
}: BudgetCategoryTableProps) {
  // Sort: by display_order, parents first, children grouped after parent
  const sortedRows = useMemo(() => sortBudgets(budgets), [budgets])

  // Track which row has the icon/color popover open
  const [editingIconId, setEditingIconId] = useState<string | null>(null)

  // Drag state
  const dragIndexRef = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Identify parent category IDs (those that have children) and compute their child sums
  const parentChildSums = useMemo(() => {
    const sums = new Map<string, number>()
    for (const b of budgets) {
      if (b.parent_id) {
        sums.set(b.parent_id, (sums.get(b.parent_id) ?? 0) + b.budget)
      }
    }
    return sums
  }, [budgets])

  const handleDragStart = useCallback((index: number) => {
    dragIndexRef.current = index
  }, [])

  const handleDragEnter = useCallback((index: number) => {
    setDragOverIndex(index)
  }, [])

  const handleDragEnd = useCallback(() => {
    const fromIndex = dragIndexRef.current
    const toIndex = dragOverIndex

    dragIndexRef.current = null
    setDragOverIndex(null)

    if (fromIndex === null || toIndex === null || fromIndex === toIndex) return

    // Reorder the array
    const reordered = [...sortedRows]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)

    onReorder(reordered)
  }, [dragOverIndex, sortedRows, onReorder])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="bg-white rounded-2xl overflow-hidden border border-[#1F1410]/5"
    >
      {/* Table header */}
      <div className="grid grid-cols-[24px_32px_1fr_1fr_80px_80px_100px_56px] gap-2 px-4 py-3 border-b border-[#1F1410]/5 text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wide">
        <div />
        <div />
        <div>Name</div>
        <div>Parent</div>
        <div>Type</div>
        <div className="text-right">Last Mo.</div>
        <div className="text-right">Budget</div>
        <div />
      </div>

      {/* Table rows */}
      <div
        className="divide-y divide-[#1F1410]/5"
        onDragOver={e => e.preventDefault()}
        onDrop={handleDragEnd}
      >
        {sortedRows.map((row, index) => (
          <TableRow
            key={row.id}
            row={row}
            index={index}
            isChild={!!row.parent_id}
            budgets={budgets}
            parentChildSums={parentChildSums}
            editingIconId={editingIconId}
            setEditingIconId={setEditingIconId}
            onBudgetChange={onBudgetChange}
            onDeleteCategory={onDeleteCategory}
            onEditCategory={onEditCategory}
            onSetParent={onSetParent}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            isDragging={dragIndexRef.current === index}
            isDragOver={dragOverIndex === index}
          />
        ))}
      </div>

      {sortedRows.length === 0 && (
        <p className="text-sm text-[#1F1410]/40 py-8 text-center">
          No categories yet. Add one above.
        </p>
      )}
    </motion.div>
  )
}

// Sort budgets: by display_order, parents first, children grouped after parent
function sortBudgets(budgets: CategoryBudget[]): CategoryBudget[] {
  // Build a map of category_id -> budget for parent lookup
  const byId = new Map<string, CategoryBudget>()
  budgets.forEach(b => {
    if (b.category_id) byId.set(b.category_id, b)
  })

  return [...budgets].sort((a, b) => {
    // Get the parent budget for children
    const aParent = a.parent_id ? byId.get(a.parent_id) : null
    const bParent = b.parent_id ? byId.get(b.parent_id) : null

    // Use parent's display_order for grouping children with parent
    const aGroupOrder = aParent?.display_order ?? a.display_order
    const bGroupOrder = bParent?.display_order ?? b.display_order

    if (aGroupOrder !== bGroupOrder) return aGroupOrder - bGroupOrder

    // If same group, parent comes before child
    if (a.category_id && b.parent_id === a.category_id) return -1
    if (b.category_id && a.parent_id === b.category_id) return 1

    // Parent before child in same group
    if (!a.parent_id && b.parent_id) return -1
    if (a.parent_id && !b.parent_id) return 1

    // Both children of same parent or both top-level: sort by display_order
    return a.display_order - b.display_order || a.name.localeCompare(b.name)
  })
}
