import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  CircleDollarSign,
  Tag,
  Calendar,
  CreditCard,
  Hash,
  FileText,
  Split,
  Pencil,
  CheckCircle2,
  PiggyBank,
  AlertTriangle,
  GitMerge,
  Search,
  Check,
  Wand2,
  X,
} from 'lucide-react'
import type { MatchType } from '../../hooks/useMerchantRules'
import { SHADOWS } from '../../lib/styles'
import type { UITransaction } from '../views/TransactionsView'
import type { UICategory } from '../../types/category'
import type { DuplicatePair } from '../../types/duplicateReconciliation'

type EditingField = 'merchant' | 'amount' | 'category' | 'date' | 'tags' | 'notes' | 'goal' | null

type FieldSaveUpdates = Partial<{
  merchant: string
  amount: number
  date: string
  category: string | null
  category_id: string | null
  tags: string | null
  notes: string | null
  goal_id: string | null
}>

type TransactionDetailPanelProps = {
  selectedTransaction: UITransaction | null
  duplicateMap: Map<string, DuplicatePair[]>
  categories: UICategory[]
  incomeCategories: UICategory[]
  transferCategories: UICategory[]
  goals?: { id: string; name: string; color: string }[]
  onEdit: () => void
  onDelete: () => void
  onMarkAsReviewed: (transactionId: string) => void
  onSplit: () => void
  onReconcile: () => void
  onFieldSave: (transactionId: string, updates: FieldSaveUpdates) => Promise<void>
  onCreateMerchantRule?: (pattern: string, matchType: MatchType, categoryId: string) => Promise<boolean>
  hasRuleForMerchant?: (merchant: string) => boolean
  onNavigateToRules?: () => void
}

type CategoryTab = 'expense' | 'income' | 'transfer'

function CategoryDropdown({
  categories,
  incomeCategories,
  transferCategories,
  currentCategoryId,
  currentType,
  anchorRef,
  onSelect,
  onClose,
}: {
  categories: UICategory[]
  incomeCategories: UICategory[]
  transferCategories: UICategory[]
  currentCategoryId: string | null
  currentType: 'income' | 'expense' | 'transfer'
  anchorRef: React.RefObject<HTMLDivElement | null>
  onSelect: (category: UICategory) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<CategoryTab>(
    currentType === 'income' ? 'income' : currentType === 'transfer' ? 'transfer' : 'expense'
  )
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  // Position the dropdown relative to the anchor element
  useLayoutEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      setPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [anchorRef])

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose, anchorRef])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const tabCategories = activeTab === 'income' ? incomeCategories
    : activeTab === 'transfer' ? transferCategories
    : categories

  const filtered = search
    ? tabCategories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : tabCategories

  const tabs: { id: CategoryTab; label: string }[] = [
    { id: 'expense', label: 'Expense' },
    { id: 'income', label: 'Income' },
    { id: 'transfer', label: 'Transfer' },
  ]

  if (!pos) return null

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed bg-white rounded-xl border border-[#1F1410]/10 overflow-hidden z-[9999]"
      style={{ boxShadow: SHADOWS.card, top: pos.top, left: pos.left, width: pos.width }}
    >
      {/* Tabs */}
      <div className="flex border-b border-[#1F1410]/5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch('') }}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-[#14B8A6] border-b-2 border-[#14B8A6]'
                : 'text-[#1F1410]/40 hover:text-[#1F1410]/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[#1F1410]/5">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#1F1410]/[0.03]">
          <Search className="w-3.5 h-3.5 text-[#1F1410]/30" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="flex-1 text-sm bg-transparent outline-none text-[#1F1410] placeholder:text-[#1F1410]/30"
          />
        </div>
      </div>

      {/* Category list */}
      <div className="max-h-[240px] overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-[#1F1410]/40 text-center py-4">No categories found</p>
        ) : (
          filtered.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#1F1410]/[0.03] transition-colors ${
                cat.id === currentCategoryId ? 'bg-[#1F1410]/[0.05]' : ''
              }`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cat.color + '20' }}
              >
                <cat.icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
              </div>
              <span className="text-sm text-[#1F1410] flex-1">{cat.name}</span>
              {cat.id === currentCategoryId && (
                <Check className="w-3.5 h-3.5 text-[#14B8A6]" />
              )}
            </button>
          ))
        )}
      </div>
    </div>,
    document.body
  )
}

function RuleCategoryPicker({
  categories,
  incomeCategories,
  transferCategories,
  currentCategoryId,
  currentType,
  onSelect,
}: {
  categories: UICategory[]
  incomeCategories: UICategory[]
  transferCategories: UICategory[]
  currentCategoryId: string | null
  currentType: 'income' | 'expense' | 'transfer'
  onSelect: (category: UICategory) => void
}) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<CategoryTab>(
    currentType === 'income' ? 'income' : currentType === 'transfer' ? 'transfer' : 'expense'
  )

  const tabCategories = activeTab === 'income' ? incomeCategories
    : activeTab === 'transfer' ? transferCategories
    : categories

  const filtered = search
    ? tabCategories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : tabCategories

  const tabs: { id: CategoryTab; label: string }[] = [
    { id: 'expense', label: 'Expense' },
    { id: 'income', label: 'Income' },
    { id: 'transfer', label: 'Transfer' },
  ]

  return (
    <>
      {/* Tabs */}
      <div className="flex border-b border-[#1F1410]/5">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearch('') }}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-[#14B8A6] border-b-2 border-[#14B8A6]'
                : 'text-[#1F1410]/40 hover:text-[#1F1410]/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-[#1F1410]/5">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#1F1410]/[0.03]">
          <Search className="w-3.5 h-3.5 text-[#1F1410]/30" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="flex-1 text-sm bg-transparent outline-none text-[#1F1410] placeholder:text-[#1F1410]/30"
          />
        </div>
      </div>

      {/* Category list */}
      <div className="max-h-[200px] overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-[#1F1410]/40 text-center py-4">No categories found</p>
        ) : (
          filtered.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelect(cat)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#1F1410]/[0.03] transition-colors ${
                cat.id === currentCategoryId ? 'bg-[#14B8A6]/5' : ''
              }`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: cat.color + '20' }}
              >
                <cat.icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
              </div>
              <span className="text-sm text-[#1F1410] flex-1">{cat.name}</span>
              {cat.id === currentCategoryId && (
                <Check className="w-3.5 h-3.5 text-[#14B8A6]" />
              )}
            </button>
          ))
        )}
      </div>
    </>
  )
}

export function TransactionDetailPanel({
  selectedTransaction,
  duplicateMap,
  categories,
  incomeCategories,
  transferCategories,
  goals = [],
  onEdit,
  onDelete: _onDelete,
  onMarkAsReviewed,
  onSplit,
  onReconcile,
  onFieldSave,
  onCreateMerchantRule,
  hasRuleForMerchant,
  onNavigateToRules,
}: TransactionDetailPanelProps) {
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const categoryRowRef = useRef<HTMLDivElement>(null)

  // Merchant rule banner state (shown after category change)
  const [ruleBanner, setRuleBanner] = useState<{
    merchant: string
    categoryName: string
    categoryId: string
  } | null>(null)

  // Merchant rule modal state (shown from action button)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [ruleFormPattern, setRuleFormPattern] = useState('')
  const [ruleFormMatchType, setRuleFormMatchType] = useState<MatchType>('contains')
  const [ruleFormCategoryId, setRuleFormCategoryId] = useState<string | null>(null)
  const [ruleSaving, setRuleSaving] = useState(false)

  // Reset editing state when transaction changes
  useEffect(() => {
    setEditingField(null)
    setEditValue('')
    setRuleBanner(null)
    setShowRuleModal(false)
  }, [selectedTransaction?.id])

  // Auto-dismiss rule banner after 8 seconds
  useEffect(() => {
    if (!ruleBanner) return
    const timer = setTimeout(() => setRuleBanner(null), 8000)
    return () => clearTimeout(timer)
  }, [ruleBanner])

  // Focus input when editing starts
  useEffect(() => {
    if (editingField && editingField !== 'category') {
      if (editingField === 'notes') {
        textareaRef.current?.focus()
        textareaRef.current?.select()
      } else {
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
  }, [editingField])

  const startEditing = useCallback((field: EditingField) => {
    if (!selectedTransaction || saving) return
    setEditingField(field)
    switch (field) {
      case 'merchant':
        setEditValue(selectedTransaction.merchant)
        break
      case 'amount':
        setEditValue(selectedTransaction.displayAmount.toFixed(2))
        break
      case 'date':
        setEditValue(selectedTransaction.rawDate)
        break
      case 'tags':
        setEditValue(selectedTransaction.tags || '')
        break
      case 'notes':
        setEditValue(selectedTransaction.notes || '')
        break
      default:
        setEditValue('')
    }
  }, [selectedTransaction, saving])

  const cancelEditing = useCallback(() => {
    setEditingField(null)
    setEditValue('')
  }, [])

  const saveField = useCallback(async () => {
    if (!selectedTransaction || !editingField || saving) return

    const updates: FieldSaveUpdates = {}
    let hasChanges = false

    switch (editingField) {
      case 'merchant':
        if (editValue.trim() && editValue.trim() !== selectedTransaction.merchant) {
          updates.merchant = editValue.trim()
          hasChanges = true
        }
        break
      case 'amount': {
        const newAmount = parseFloat(editValue)
        if (!isNaN(newAmount) && newAmount > 0 && newAmount !== selectedTransaction.displayAmount) {
          // Preserve sign: income positive, expense/transfer negative
          updates.amount = selectedTransaction.type === 'income' ? newAmount : -newAmount
          hasChanges = true
        }
        break
      }
      case 'date':
        if (editValue && editValue !== selectedTransaction.rawDate) {
          updates.date = editValue
          hasChanges = true
        }
        break
      case 'tags': {
        const newTags = editValue.trim() || null
        if (newTags !== selectedTransaction.tags) {
          updates.tags = newTags
          hasChanges = true
        }
        break
      }
      case 'notes': {
        const newNotes = editValue.trim() || null
        if (newNotes !== selectedTransaction.notes) {
          updates.notes = newNotes
          hasChanges = true
        }
        break
      }
    }

    if (hasChanges) {
      setSaving(true)
      try {
        await onFieldSave(selectedTransaction.id, updates)
      } finally {
        setSaving(false)
      }
    }

    setEditingField(null)
    setEditValue('')
  }, [selectedTransaction, editingField, editValue, saving, onFieldSave])

  const handleCategorySelect = useCallback(async (category: UICategory) => {
    if (!selectedTransaction || saving) return
    if (category.id === selectedTransaction.category_id) {
      setEditingField(null)
      return
    }

    setSaving(true)
    try {
      await onFieldSave(selectedTransaction.id, {
        category: category.name,
        category_id: category.id,
      })

      // Show rule banner if no rule already exists for this merchant
      if (
        onCreateMerchantRule &&
        selectedTransaction.merchant &&
        (!hasRuleForMerchant || !hasRuleForMerchant(selectedTransaction.merchant))
      ) {
        setRuleBanner({
          merchant: selectedTransaction.merchant,
          categoryName: category.name,
          categoryId: category.id,
        })
      }
    } finally {
      setSaving(false)
    }
    setEditingField(null)
  }, [selectedTransaction, saving, onFieldSave, onCreateMerchantRule, hasRuleForMerchant])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && editingField !== 'notes') {
      e.preventDefault()
      saveField()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }, [editingField, saveField, cancelEditing])

  const handleNotesKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      saveField()
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }, [saveField, cancelEditing])

  const editableFieldClass = 'cursor-pointer rounded-md px-1 -mx-1 transition-colors hover:bg-[#1F1410]/[0.04]'

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden lg:sticky lg:top-8 h-fit"
      style={{ boxShadow: SHADOWS.card }}
    >
      {selectedTransaction ? (
        <div className="p-6">
          {/* Header with merchant and amount */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: selectedTransaction.color }}
              >
                <selectedTransaction.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                {/* Merchant - editable */}
                {editingField === 'merchant' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={saveField}
                    className="font-bold text-lg text-[#1F1410] w-full bg-[#1F1410]/[0.03] rounded-md px-1 -mx-1 outline-none ring-1 ring-[#14B8A6]/40"
                  />
                ) : (
                  <h3
                    onClick={() => startEditing('merchant')}
                    className={`font-bold text-lg text-[#1F1410] truncate ${editableFieldClass}`}
                  >
                    {selectedTransaction.merchant}
                  </h3>
                )}

                {/* Amount - editable */}
                {editingField === 'amount' ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span
                      className="text-2xl font-bold"
                      style={{
                        color: selectedTransaction.type === 'income' ? '#10B981' :
                               selectedTransaction.type === 'transfer' ? '#8B5CF6' : '#1F1410'
                      }}
                    >
                      {selectedTransaction.type === 'income' ? '+' : '-'}$
                    </span>
                    <input
                      ref={inputRef}
                      type="number"
                      step="0.01"
                      min="0"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={saveField}
                      className="text-2xl font-bold w-32 bg-[#1F1410]/[0.03] rounded-md px-1 outline-none ring-1 ring-[#14B8A6]/40"
                      style={{
                        color: selectedTransaction.type === 'income' ? '#10B981' :
                               selectedTransaction.type === 'transfer' ? '#8B5CF6' : '#1F1410'
                      }}
                    />
                  </div>
                ) : (
                  <p
                    onClick={() => startEditing('amount')}
                    className={`text-2xl font-bold ${editableFieldClass}`}
                    style={{
                      color: selectedTransaction.type === 'income' ? '#10B981' :
                             selectedTransaction.type === 'transfer' ? '#8B5CF6' : '#1F1410'
                    }}
                  >
                    {selectedTransaction.type === 'income' ? '+' : '-'}${selectedTransaction.displayAmount.toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Type - read only */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                <CircleDollarSign className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div>
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Type</p>
                <p className="text-sm font-medium text-[#1F1410] capitalize">{selectedTransaction.type}</p>
              </div>
            </div>

            {/* Category - editable dropdown */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                <Tag className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div className="flex-1" ref={categoryRowRef}>
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Category</p>
                <p
                  onClick={() => startEditing('category')}
                  className={`text-sm font-medium ${editableFieldClass}`}
                  style={{ color: selectedTransaction.color }}
                >
                  {selectedTransaction.category}
                </p>
                {editingField === 'category' && (
                  <CategoryDropdown
                    categories={categories}
                    incomeCategories={incomeCategories}
                    transferCategories={transferCategories}
                    currentCategoryId={selectedTransaction.category_id}
                    currentType={selectedTransaction.type}
                    anchorRef={categoryRowRef}
                    onSelect={handleCategorySelect}
                    onClose={cancelEditing}
                  />
                )}
              </div>
            </div>

            {/* Merchant Rule Banner (after category change) */}
            {ruleBanner && onCreateMerchantRule && (
              <div className="ml-11 p-3 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20">
                <p className="text-sm text-[#1F1410]/80">
                  Always categorize <span className="font-semibold">{ruleBanner.merchant}</span> as{' '}
                  <span className="font-semibold" style={{ color: '#14B8A6' }}>{ruleBanner.categoryName}</span>?
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={async () => {
                      const success = await onCreateMerchantRule(
                        ruleBanner.merchant.toLowerCase(),
                        'contains',
                        ruleBanner.categoryId,
                      )
                      if (success) setRuleBanner(null)
                    }}
                    className="px-3 py-1 text-xs font-medium text-white bg-[#14B8A6] rounded-lg hover:bg-[#0D9488] transition-colors"
                  >
                    Create Rule
                  </button>
                  <button
                    onClick={() => setRuleBanner(null)}
                    className="px-3 py-1 text-xs font-medium text-[#1F1410]/50 hover:text-[#1F1410]/80 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Date - editable */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Date</p>
                {editingField === 'date' ? (
                  <input
                    ref={inputRef}
                    type="date"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={saveField}
                    className="text-sm font-medium text-[#1F1410] bg-[#1F1410]/[0.03] rounded-md px-1 -mx-1 outline-none ring-1 ring-[#14B8A6]/40"
                  />
                ) : (
                  <p
                    onClick={() => startEditing('date')}
                    className={`text-sm font-medium text-[#1F1410] ${editableFieldClass}`}
                  >
                    {new Date(selectedTransaction.rawDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Source - read only */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div>
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Source</p>
                <p className="text-sm font-medium text-[#1F1410]">{selectedTransaction.source}</p>
              </div>
            </div>

            {/* Tags - always shown, editable */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Tags</p>
                {editingField === 'tags' ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={saveField}
                    placeholder="tag1, tag2, ..."
                    className="text-sm w-full bg-[#1F1410]/[0.03] rounded-md px-1 -mx-1 py-0.5 outline-none ring-1 ring-[#14B8A6]/40 text-[#1F1410] placeholder:text-[#1F1410]/30"
                  />
                ) : (
                  <div
                    onClick={() => startEditing('tags')}
                    className={`${editableFieldClass} min-h-[24px]`}
                  >
                    {selectedTransaction.tags ? (
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
                    ) : (
                      <p className="text-sm text-[#1F1410]/30 mt-0.5">Add tags...</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notes - always shown, editable */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Notes</p>
                {editingField === 'notes' ? (
                  <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={handleNotesKeyDown}
                    onBlur={saveField}
                    placeholder="Add a note..."
                    rows={3}
                    className="text-sm w-full bg-[#1F1410]/[0.03] rounded-md px-1 -mx-1 py-1 outline-none ring-1 ring-[#14B8A6]/40 text-[#1F1410] placeholder:text-[#1F1410]/30 resize-none"
                  />
                ) : (
                  <div
                    onClick={() => startEditing('notes')}
                    className={`${editableFieldClass} min-h-[24px]`}
                  >
                    {selectedTransaction.notes ? (
                      <p className="text-sm text-[#1F1410]/70 mt-0.5">{selectedTransaction.notes}</p>
                    ) : (
                      <p className="text-sm text-[#1F1410]/30 mt-0.5">Add a note...</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Savings Goal - editable dropdown */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center flex-shrink-0">
                <PiggyBank className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Savings Goal</p>
                {goals.length > 0 ? (
                  editingField === 'goal' ? (
                    <select
                      value={selectedTransaction.goal_id || ''}
                      onChange={async (e) => {
                        const newGoalId = e.target.value || null
                        setSaving(true)
                        try {
                          await onFieldSave(selectedTransaction.id, { goal_id: newGoalId })
                        } finally {
                          setSaving(false)
                        }
                        setEditingField(null)
                      }}
                      onBlur={() => setEditingField(null)}
                      autoFocus
                      className="text-sm w-full bg-[#1F1410]/[0.03] rounded-md px-1 -mx-1 py-1 outline-none ring-1 ring-[#14B8A6]/40 text-[#1F1410]"
                    >
                      <option value="">None</option>
                      {goals.map((goal) => (
                        <option key={goal.id} value={goal.id}>
                          {goal.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      onClick={() => startEditing('goal')}
                      className={`${editableFieldClass} min-h-[24px]`}
                    >
                      {selectedTransaction.goal_id ? (() => {
                        const goal = goals.find(g => g.id === selectedTransaction.goal_id)
                        return goal ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-0.5"
                            style={{ backgroundColor: `${goal.color}15`, color: goal.color }}
                          >
                            <PiggyBank className="w-3 h-3" />
                            {goal.name}
                          </span>
                        ) : (
                          <p className="text-sm text-[#1F1410]/30 mt-0.5">Select a goal...</p>
                        )
                      })() : (
                        <p className="text-sm text-[#1F1410]/30 mt-0.5">Link to a goal...</p>
                      )}
                    </div>
                  )
                ) : (
                  <p className="text-sm text-[#1F1410]/30 mt-0.5">No goals yet</p>
                )}
              </div>
            </div>

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

          {/* Potential Duplicate / Transfer Warning */}
          {duplicateMap.has(selectedTransaction.id) && (() => {
            const matchPairs = duplicateMap.get(selectedTransaction.id)!
            const hasTransfer = matchPairs.some(p => p.pairType === 'transfer')
            const hasDuplicate = matchPairs.some(p => p.pairType === 'duplicate')
            const bgColor = hasTransfer && !hasDuplicate ? '#8B5CF6' : '#F59E0B'
            const label = hasTransfer && !hasDuplicate
              ? 'Potential Transfer'
              : hasDuplicate && !hasTransfer
              ? 'Potential Duplicate'
              : 'Potential Duplicate / Transfer'
            const textColor = hasTransfer && !hasDuplicate ? '#6D28D9' : '#92400E'
            const textColorHover = hasTransfer && !hasDuplicate ? '#5B21B6' : '#78350F'

            return (
              <div className="mt-4 p-3 rounded-xl border" style={{ backgroundColor: `${bgColor}10`, borderColor: `${bgColor}33` }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: bgColor }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: textColor }}>
                      {label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: `${textColor}B3` }}>
                      {matchPairs.length} possible {matchPairs.length === 1 ? 'match' : 'matches'} found
                    </p>
                    <button
                      onClick={onReconcile}
                      className="flex items-center gap-1.5 mt-2 text-xs font-medium transition-colors"
                      style={{ color: textColor }}
                      onMouseEnter={e => (e.currentTarget.style.color = textColorHover)}
                      onMouseLeave={e => (e.currentTarget.style.color = textColor)}
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Action Buttons */}
          {selectedTransaction.needs_review && (
            <button
              onClick={() => onMarkAsReviewed(selectedTransaction.id)}
              className="w-full mt-6 py-2.5 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Mark Reviewed
            </button>
          )}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[#1F1410]/5">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-[#1F1410] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            {onCreateMerchantRule && (
              <button
                onClick={() => {
                  setRuleFormPattern(selectedTransaction.merchant.toLowerCase())
                  setRuleFormMatchType('contains')
                  setRuleFormCategoryId(selectedTransaction.category_id)
                  setShowRuleModal(true)
                }}
                className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-[#14B8A6] transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Create Rule
              </button>
            )}
            <button
              onClick={onSplit}
              className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-[#8B5CF6] transition-colors"
            >
              <Split className="w-3.5 h-3.5" />
              {selectedTransaction.splits.length > 0 ? 'Edit Split' : 'Split'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <CircleDollarSign className="w-12 h-12 text-[#1F1410]/10 mx-auto mb-3" />
          <p className="text-[#1F1410]/40 text-sm">Select a transaction to view details</p>
        </div>
      )}

      {/* Merchant Rule Modal */}
      {showRuleModal && onCreateMerchantRule && selectedTransaction && createPortal(
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center"
          onClick={() => setShowRuleModal(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30" />

          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl w-full max-w-md mx-4 p-6"
            style={{ boxShadow: SHADOWS.card }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-[#14B8A6]" />
                <h3 className="text-lg font-bold text-[#1F1410]">Create Merchant Rule</h3>
              </div>
              <button onClick={() => setShowRuleModal(false)} className="text-[#1F1410]/40 hover:text-[#1F1410]/70 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Pattern */}
            <div className="mb-4">
              <label className="text-xs text-[#1F1410]/50 uppercase tracking-wide font-medium">Pattern</label>
              <input
                type="text"
                value={ruleFormPattern}
                onChange={e => setRuleFormPattern(e.target.value)}
                className="mt-1.5 w-full text-sm bg-white rounded-xl border border-[#1F1410]/10 px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6]/40 text-[#1F1410] transition-all"
                placeholder="merchant name pattern"
              />
            </div>

            {/* Match Type */}
            <div className="mb-4">
              <label className="text-xs text-[#1F1410]/50 uppercase tracking-wide font-medium">Match Type</label>
              <div className="flex gap-2 mt-1.5">
                {(['contains', 'exact', 'starts_with'] as MatchType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setRuleFormMatchType(type)}
                    className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
                      ruleFormMatchType === type
                        ? 'bg-[#14B8A6] text-white'
                        : 'bg-[#1F1410]/5 text-[#1F1410]/60 hover:bg-[#1F1410]/10'
                    }`}
                  >
                    {type === 'starts_with' ? 'Starts with' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Category List (inline, scrollable) */}
            <div className="mb-5">
              <label className="text-xs text-[#1F1410]/50 uppercase tracking-wide font-medium">Category</label>
              <div className="mt-1.5 border border-[#1F1410]/10 rounded-xl overflow-hidden">
                <RuleCategoryPicker
                  categories={categories}
                  incomeCategories={incomeCategories}
                  transferCategories={transferCategories}
                  currentCategoryId={ruleFormCategoryId}
                  currentType={selectedTransaction.type}
                  onSelect={(cat) => setRuleFormCategoryId(cat.id)}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {onNavigateToRules && (
                <button
                  onClick={() => {
                    setShowRuleModal(false)
                    onNavigateToRules()
                  }}
                  className="text-sm font-medium text-[#14B8A6] hover:text-[#0D9488] transition-colors"
                >
                  Manage all rules →
                </button>
              )}
              <div className="flex-1" />
              <button
                onClick={() => setShowRuleModal(false)}
                className="px-4 py-2 text-sm font-medium text-[#1F1410]/50 hover:text-[#1F1410]/80 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!ruleFormPattern.trim() || !ruleFormCategoryId || ruleSaving}
                onClick={async () => {
                  if (!ruleFormPattern.trim() || !ruleFormCategoryId) return
                  setRuleSaving(true)
                  try {
                    await onCreateMerchantRule(ruleFormPattern.trim(), ruleFormMatchType, ruleFormCategoryId)
                    setShowRuleModal(false)
                  } finally {
                    setRuleSaving(false)
                  }
                }}
                className="px-5 py-2 text-sm font-medium text-white bg-[#14B8A6] rounded-xl hover:bg-[#0D9488] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {ruleSaving ? 'Saving...' : 'Save Rule'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
