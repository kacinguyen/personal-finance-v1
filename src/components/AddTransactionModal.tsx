import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, DollarSign, Calendar, Store, Tag, ChevronDown, Hash, FileText, Trash2 } from 'lucide-react'
import { UICategory } from './CategoryDropdown'

type CategoryGroup = {
  parent: UICategory
  children: UICategory[]
}

export type TransactionType = 'income' | 'expense' | 'transfer'

export type TransactionFormData = {
  id?: string
  merchant: string
  amount: number
  date: string
  category: UICategory | null
  tags: string | null
  notes: string | null
  type: TransactionType
}

type AddTransactionModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (transaction: TransactionFormData) => Promise<void>
  onDelete?: (transactionId: string) => Promise<void>
  categories: UICategory[]
  incomeCategories: UICategory[]
  transferCategories: UICategory[]
  defaultDate?: string
  editTransaction?: TransactionFormData | null
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  categories,
  incomeCategories,
  transferCategories,
  defaultDate,
  editTransaction,
}: AddTransactionModalProps) {
  const [merchant, setMerchant] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [selectedCategory, setSelectedCategory] = useState<UICategory | null>(null)
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
  const [tags, setTags] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [transactionType, setTransactionType] = useState<TransactionType>('expense')

  const isEditing = !!editTransaction?.id
  const merchantInputRef = useRef<HTMLInputElement>(null)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  // Focus merchant input when modal opens
  useEffect(() => {
    if (isOpen && merchantInputRef.current) {
      setTimeout(() => merchantInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Populate form when editing or reset when adding new
  useEffect(() => {
    if (isOpen && editTransaction) {
      setMerchant(editTransaction.merchant)
      setAmount(editTransaction.amount.toString())
      setDate(editTransaction.date)
      setSelectedCategory(editTransaction.category)
      setTags(editTransaction.tags || '')
      setNotes(editTransaction.notes || '')
      setTransactionType(editTransaction.type || 'expense')
      setError(null)
    } else if (!isOpen) {
      setMerchant('')
      setAmount('')
      setDate(defaultDate || new Date().toISOString().split('T')[0])
      setSelectedCategory(null)
      setTags('')
      setNotes('')
      setTransactionType('expense')
      setError(null)
    }
  }, [isOpen, editTransaction, defaultDate])

  // Close category dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get the active categories based on transaction type
  const activeCategories = useMemo(() => {
    switch (transactionType) {
      case 'income':
        return incomeCategories
      case 'transfer':
        return transferCategories
      default:
        return categories
    }
  }, [transactionType, categories, incomeCategories, transferCategories])

  // Organize categories into hierarchical groups
  const categoryGroups = useMemo((): CategoryGroup[] => {
    const parents = activeCategories.filter(c => !c.parent_id)
    const children = activeCategories.filter(c => c.parent_id)

    // Build a map of parent_id to children
    const childMap = new Map<string, UICategory[]>()
    children.forEach(child => {
      if (child.parent_id) {
        const existing = childMap.get(child.parent_id) || []
        existing.push(child)
        childMap.set(child.parent_id, existing)
      }
    })

    // Create groups with parent and their children
    return parents.map(parent => ({
      parent,
      children: childMap.get(parent.id) || [],
    }))
  }, [activeCategories])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!merchant.trim()) {
      setError('Please enter a merchant name')
      return
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!date) {
      setError('Please select a date')
      return
    }

    setSaving(true)
    try {
      await onSave({
        id: editTransaction?.id,
        merchant: merchant.trim(),
        amount: parsedAmount,
        date,
        category: selectedCategory,
        tags: tags.trim() || null,
        notes: notes.trim() || null,
        type: transactionType,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editTransaction?.id || !onDelete) return

    setDeleting(true)
    try {
      await onDelete(editTransaction.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete transaction')
    } finally {
      setDeleting(false)
    }
  }

  const handleAmountChange = (value: string) => {
    // Allow only numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '')
    const parts = cleaned.split('.')
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    setAmount(cleaned)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1F1410]/40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F1410]/5 flex-shrink-0">
                <h2 className="text-lg font-bold text-[#1F1410]">
                  {isEditing ? 'Edit Transaction' : 'Add Transaction'}
                </h2>
                <div className="flex items-center gap-2">
                  {isEditing && onDelete && (
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1F1410]/5 transition-colors"
                  >
                    <X className="w-5 h-5 text-[#1F1410]/40" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Transaction Type Toggle */}
                <div>
                  <label className="block text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-1.5">
                    Type
                  </label>
                  <div className="flex items-center gap-1 bg-[#1F1410]/5 rounded-lg p-1">
                    {(['expense', 'income', 'transfer'] as TransactionType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setTransactionType(type)
                          setSelectedCategory(null)
                        }}
                        className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                          transactionType === type
                            ? 'bg-white text-[#1F1410] shadow-sm'
                            : 'text-[#1F1410]/60 hover:text-[#1F1410]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Merchant Name */}
                <div>
                  <label className="block text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-1.5">
                    Merchant Name
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1F1410]/30" />
                    <input
                      ref={merchantInputRef}
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      placeholder="e.g., Whole Foods, Amazon"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1F1410]/10 focus:border-[#F59E0B]/30 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/10 transition-all placeholder:text-[#1F1410]/30"
                    />
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-1.5">
                    Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1F1410]/30" />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1F1410]/10 focus:border-[#F59E0B]/30 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/10 transition-all placeholder:text-[#1F1410]/30"
                    />
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-1.5">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1F1410]/30" />
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1F1410]/10 focus:border-[#F59E0B]/30 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/10 transition-all"
                    />
                  </div>
                </div>

                {/* Category */}
                <div ref={categoryDropdownRef}>
                  <label className="block text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-1.5">
                    Category (optional)
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="w-full flex items-center justify-between pl-10 pr-4 py-2.5 rounded-xl border border-[#1F1410]/10 hover:border-[#1F1410]/20 focus:border-[#F59E0B]/30 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/10 transition-all text-left"
                    >
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1F1410]/30" />
                      {selectedCategory ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center"
                            style={{ backgroundColor: `${selectedCategory.color}15` }}
                          >
                            <selectedCategory.icon
                              className="w-3.5 h-3.5"
                              style={{ color: selectedCategory.color }}
                            />
                          </div>
                          <span className="text-[#1F1410]">{selectedCategory.name}</span>
                        </div>
                      ) : (
                        <span className="text-[#1F1410]/30">Select a category</span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-[#1F1410]/40 transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`}
                      />
                    </button>

                    {/* Category Dropdown */}
                    <AnimatePresence>
                      {isCategoryDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[#1F1410]/10 shadow-xl max-h-64 overflow-y-auto z-50"
                        >
                          {/* No category option */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCategory(null)
                              setIsCategoryDropdownOpen(false)
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#1F1410]/5 transition-colors text-left border-b border-[#1F1410]/5"
                          >
                            <div className="w-5 h-5 rounded-md bg-[#1F1410]/5 flex items-center justify-center">
                              <Tag className="w-3 h-3 text-[#1F1410]/30" />
                            </div>
                            <span className="text-sm text-[#1F1410]/50">No category</span>
                          </button>

                          {/* Hierarchical category list */}
                          {categoryGroups.map((group) => (
                            <div key={group.parent.id}>
                              {/* Parent category as header (clickable) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(group.parent)
                                  setIsCategoryDropdownOpen(false)
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#1F1410]/5 transition-colors text-left"
                              >
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center"
                                  style={{ backgroundColor: `${group.parent.color}15` }}
                                >
                                  <group.parent.icon
                                    className="w-3 h-3"
                                    style={{ color: group.parent.color }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-[#1F1410]/70 uppercase tracking-wide">
                                  {group.parent.name}
                                </span>
                              </button>

                              {/* Child categories */}
                              {group.children.map((child) => (
                                <button
                                  key={child.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCategory(child)
                                    setIsCategoryDropdownOpen(false)
                                  }}
                                  className="w-full flex items-center gap-2 pl-7 pr-3 py-1.5 hover:bg-[#1F1410]/5 transition-colors text-left"
                                >
                                  <div
                                    className="w-5 h-5 rounded-md flex items-center justify-center"
                                    style={{ backgroundColor: `${child.color}15` }}
                                  >
                                    <child.icon
                                      className="w-3 h-3"
                                      style={{ color: child.color }}
                                    />
                                  </div>
                                  <span className="text-sm text-[#1F1410]">{child.name}</span>
                                </button>
                              ))}
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-1.5">
                    Tags (optional)
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#1F1410]/30" />
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="groceries, work, travel"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1F1410]/10 focus:border-[#F59E0B]/30 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/10 transition-all placeholder:text-[#1F1410]/30"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-1.5">
                    Notes (optional)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 w-5 h-5 text-[#1F1410]/30" />
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional details..."
                      rows={2}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#1F1410]/10 focus:border-[#F59E0B]/30 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/10 transition-all placeholder:text-[#1F1410]/30 resize-none"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-lg"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-[#F59E0B] hover:bg-[#F59E0B]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Transaction'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
