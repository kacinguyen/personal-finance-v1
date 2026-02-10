import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, DollarSign, AlertCircle } from 'lucide-react'
import type { UICategory } from '../../types/category'
import type { UISplit } from '../../types/transactionSplit'

type SplitTransactionModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (splits: UISplit[]) => Promise<void>
  transactionAmount: number
  transactionMerchant: string
  categories: UICategory[]
  existingSplits?: UISplit[]
}

export function SplitTransactionModal({
  isOpen,
  onClose,
  onSave,
  transactionAmount,
  transactionMerchant,
  categories,
  existingSplits,
}: SplitTransactionModalProps) {
  const [splits, setSplits] = useState<UISplit[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const absoluteAmount = Math.abs(transactionAmount)

  // Initialize splits when modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingSplits && existingSplits.length > 0) {
        setSplits(existingSplits.map(s => ({ ...s, amount: Math.abs(s.amount) })))
      } else {
        // Start with one split containing the full amount
        setSplits([{ amount: absoluteAmount, category_id: null, category_name: null, notes: null }])
      }
      setError(null)
    }
  }, [isOpen, existingSplits, absoluteAmount])

  const totalAllocated = useMemo(() => {
    return splits.reduce((sum, split) => sum + (split.amount || 0), 0)
  }, [splits])

  const remaining = absoluteAmount - totalAllocated
  const isBalanced = Math.abs(remaining) < 0.01

  const handleAddSplit = () => {
    const newAmount = remaining > 0 ? remaining : 0
    setSplits([...splits, { amount: newAmount, category_id: null, category_name: null, notes: null }])
  }

  const handleRemoveSplit = (index: number) => {
    if (splits.length > 1) {
      setSplits(splits.filter((_, i) => i !== index))
    }
  }

  const handleSplitChange = (index: number, field: keyof UISplit, value: string | number | null) => {
    setSplits(splits.map((split, i) => {
      if (i !== index) return split
      if (field === 'category_id') {
        const category = categories.find(c => c.id === value)
        return { ...split, category_id: value as string | null, category_name: category?.name || null }
      }
      return { ...split, [field]: value }
    }))
  }

  const handleAmountChange = (index: number, value: string) => {
    const parsed = parseFloat(value)
    const amount = isNaN(parsed) ? 0 : Math.max(0, parsed)
    handleSplitChange(index, 'amount', amount)
  }

  const handleSave = async () => {
    setError(null)

    if (!isBalanced) {
      setError(`Split amounts must equal $${absoluteAmount.toFixed(2)}. Currently: $${totalAllocated.toFixed(2)}`)
      return
    }

    if (splits.length < 2) {
      setError('You need at least 2 splits to split a transaction')
      return
    }

    setSaving(true)
    try {
      // Convert amounts back to negative if original was negative
      const finalSplits = splits.map(s => ({
        ...s,
        amount: transactionAmount < 0 ? -s.amount : s.amount,
      }))
      await onSave(finalSplits)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save splits')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveAllSplits = async () => {
    setSaving(true)
    try {
      await onSave([])
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove splits')
    } finally {
      setSaving(false)
    }
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
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F1410]/5 flex-shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-[#1F1410]">Split Transaction</h2>
                  <p className="text-sm text-[#1F1410]/50">{transactionMerchant}</p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1F1410]/5 transition-colors"
                >
                  <X className="w-5 h-5 text-[#1F1410]/40" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto flex-1">
                {/* Total Amount Display */}
                <div className="flex items-center justify-between mb-4 p-3 bg-[#1F1410]/5 rounded-xl">
                  <span className="text-sm font-medium text-[#1F1410]/70">Total Amount</span>
                  <span className="text-lg font-bold text-[#1F1410]">${absoluteAmount.toFixed(2)}</span>
                </div>

                {/* Splits List */}
                <div className="space-y-3 mb-4">
                  {splits.map((split, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-3 border border-[#1F1410]/10 rounded-xl"
                    >
                      <div className="flex-1 space-y-3">
                        {/* Amount Input */}
                        <div>
                          <label className="block text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-1">
                            Amount
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1F1410]/30" />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={split.amount || ''}
                              onChange={(e) => handleAmountChange(index, e.target.value)}
                              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#1F1410]/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6]/30 transition-all"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {/* Category Select */}
                        <div>
                          <label className="block text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-1">
                            Category
                          </label>
                          <select
                            value={split.category_id || ''}
                            onChange={(e) => handleSplitChange(index, 'category_id', e.target.value || null)}
                            className="w-full px-3 py-2 rounded-lg border border-[#1F1410]/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6]/30 transition-all bg-white"
                          >
                            <option value="">Select category...</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Notes Input */}
                        <div>
                          <label className="block text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-1">
                            Notes (optional)
                          </label>
                          <input
                            type="text"
                            value={split.notes || ''}
                            onChange={(e) => handleSplitChange(index, 'notes', e.target.value || null)}
                            className="w-full px-3 py-2 rounded-lg border border-[#1F1410]/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6]/30 transition-all"
                            placeholder="e.g., Groceries portion"
                          />
                        </div>
                      </div>

                      {/* Remove Button */}
                      {splits.length > 1 && (
                        <button
                          onClick={() => handleRemoveSplit(index)}
                          className="mt-6 p-2 text-[#1F1410]/30 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Add Split Button */}
                <button
                  onClick={handleAddSplit}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-[#1F1410]/20 rounded-xl text-sm font-medium text-[#1F1410]/50 hover:border-[#8B5CF6]/30 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Split
                </button>

                {/* Balance Indicator */}
                <div className={`mt-4 p-3 rounded-xl ${isBalanced ? 'bg-green-50' : 'bg-amber-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isBalanced ? 'text-green-700' : 'text-amber-700'}`}>
                      {isBalanced ? 'Splits balanced' : 'Remaining to allocate'}
                    </span>
                    <span className={`text-sm font-bold ${isBalanced ? 'text-green-700' : 'text-amber-700'}`}>
                      {isBalanced ? '✓' : `$${remaining.toFixed(2)}`}
                    </span>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 flex items-start gap-2 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-lg"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-[#1F1410]/5 flex-shrink-0">
                <div className="flex gap-3">
                  {existingSplits && existingSplits.length > 0 && (
                    <button
                      onClick={handleRemoveAllSplits}
                      disabled={saving}
                      className="px-4 py-2.5 rounded-xl font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      Remove Splits
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl font-medium text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={saving || !isBalanced || splits.length < 2}
                    className="px-6 py-2.5 rounded-xl font-medium text-white bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Splits'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
