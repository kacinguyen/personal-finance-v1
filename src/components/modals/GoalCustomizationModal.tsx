import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  DollarSign,
  Target,
  PiggyBank,
  Zap,
  Tag,
  Calendar,
  Link2,
} from 'lucide-react'
import { DatePicker } from '../ui/DatePicker'
import { getIcon } from '../../lib/iconMap'

// Paystub fields that can be linked to auto-contributions
const PAYSTUB_CONTRIBUTION_FIELDS = [
  { value: 'traditional_401k', label: '401(k) Contribution' },
  { value: 'roth_401k', label: 'Roth 401(k) Contribution' },
  { value: 'after_tax_401k', label: 'After-Tax 401(k)' },
  { value: 'espp_contribution', label: 'ESPP Contribution' },
  { value: 'hsa_contribution', label: 'HSA Contribution' },
]

type LinkedCategoryEntry = { categoryId: string; autoTag: boolean }

type AvailableCategory = {
  id: string
  name: string
  icon: string
  color: string
}

type EditingGoal = {
  id: string
  name: string
  currentAmount: number
  targetAmount: number
  targetDate: Date
  autoContribute?: boolean
  contributionField?: string | null
  linkedCategories?: LinkedCategoryEntry[]
}

type GoalCustomizationModalProps = {
  isOpen: boolean
  editingGoal?: EditingGoal | null
  availableCategories?: AvailableCategory[]
  onClose: () => void
  onSave: (customizedGoal: {
    id?: string
    name: string
    tag: string
    amount: number
    currentAmount?: number
    targetDate: Date
    goalType: string
    icon: string
    color: string
    autoContribute?: boolean
    contributionField?: string | null
    linkedCategories?: LinkedCategoryEntry[]
  }) => void
}

function nameToTag(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

export function GoalCustomizationModal({ isOpen, editingGoal, availableCategories = [], onClose, onSave }: GoalCustomizationModalProps) {
  const [goalName, setGoalName] = useState('')
  const [tag, setTag] = useState('')
  const [tagEdited, setTagEdited] = useState(false)
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [autoContribute, setAutoContribute] = useState(false)
  const [contributionField, setContributionField] = useState('')
  const [linkedCategories, setLinkedCategories] = useState<LinkedCategoryEntry[]>([])
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false)

  const isEditMode = !!editingGoal

  // Set default date to 1 year from now
  const getDefaultDate = () => {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)
    return date.toISOString().split('T')[0]
  }

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // Auto-generate tag from name (unless user has manually edited)
  useEffect(() => {
    if (!tagEdited && goalName) {
      setTag(nameToTag(goalName))
    } else if (!goalName) {
      setTag('')
      setTagEdited(false)
    }
  }, [goalName, tagEdited])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setGoalName('')
      setTag('')
      setTagEdited(false)
      setTargetAmount('')
      setTargetDate('')
      setAutoContribute(false)
      setContributionField('')
      setLinkedCategories([])
      setIsCategoryPickerOpen(false)
    }
  }, [isOpen])

  // Pre-fill for edit mode
  useEffect(() => {
    if (editingGoal) {
      setGoalName(editingGoal.name)
      setTag(nameToTag(editingGoal.name))
      setTargetAmount(editingGoal.targetAmount.toString())
      setTargetDate(formatDateForInput(editingGoal.targetDate))
      setAutoContribute(editingGoal.autoContribute ?? false)
      setContributionField(editingGoal.contributionField ?? '')
      setLinkedCategories(editingGoal.linkedCategories ?? [])
    } else if (isOpen) {
      setTargetDate(getDefaultDate())
    }
  }, [editingGoal, isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const handleSave = () => {
    if (goalName.trim() && targetAmount && parseFloat(targetAmount) > 0 && targetDate) {
      onSave({
        id: editingGoal?.id,
        name: goalName.trim(),
        tag: tag || nameToTag(goalName.trim()),
        amount: parseFloat(targetAmount),
        currentAmount: editingGoal?.currentAmount,
        targetDate: new Date(targetDate),
        goalType: 'custom',
        icon: 'PiggyBank',
        color: '#14B8A6',
        autoContribute: autoContribute,
        contributionField: autoContribute ? contributionField : null,
        linkedCategories,
      })
      onClose()
    }
  }

  // Calculate months until target for summary display
  const getMonthsUntilTarget = () => {
    if (!targetDate) return 0
    const target = new Date(targetDate)
    const now = new Date()
    const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
    return Math.max(1, months)
  }

  const goalColor = '#14B8A6'

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
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-[#1F1410]/10" style={{ backgroundColor: `${goalColor}05` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${goalColor}15` }}
                    >
                      <PiggyBank className="w-7 h-7" style={{ color: goalColor }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#1F1410]">
                        {isEditMode ? 'Edit Goal' : 'Create a Savings Goal'}
                      </h2>
                      <p className="text-sm text-[#1F1410]/60 mt-0.5">
                        {isEditMode ? 'Update your goal details' : 'Set a target and start saving'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1F1410]/5 transition-colors"
                  >
                    <X className="w-5 h-5 text-[#1F1410]/60" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-5 overflow-y-auto">
                {/* Goal Name */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#1F1410]/70 mb-2">
                    <Target className="w-4 h-4" />
                    Goal Name
                  </label>
                  <input
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    placeholder="e.g., Trip to Japan"
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#1F1410]/10 focus:border-[#1F1410]/20 focus:outline-none focus:ring-4 focus:ring-[#1F1410]/5 transition-all text-[#1F1410] placeholder:text-[#1F1410]/30"
                  />
                </div>

                {/* Tag */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#1F1410]/70 mb-2">
                    <Tag className="w-4 h-4" />
                    Tag
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => {
                        setTag(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                        setTagEdited(true)
                      }}
                      placeholder="auto-generated-tag"
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-[#1F1410]/10 focus:border-[#1F1410]/20 focus:outline-none focus:ring-4 focus:ring-[#1F1410]/5 transition-all text-[#1F1410] placeholder:text-[#1F1410]/30 font-mono text-sm"
                    />
                    {tag && (
                      <span
                        className="px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0"
                        style={{ backgroundColor: `${goalColor}15`, color: goalColor }}
                      >
                        {tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#1F1410]/40 mt-1.5">
                    Link transactions to this goal using this tag
                  </p>
                </div>

                {/* Target Amount */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#1F1410]/70 mb-2">
                    <DollarSign className="w-4 h-4" />
                    Target Amount
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1F1410]/40 font-medium">$</span>
                    <input
                      type="number"
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      placeholder="0"
                      className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-[#1F1410]/10 focus:border-[#1F1410]/20 focus:outline-none focus:ring-4 focus:ring-[#1F1410]/5 transition-all text-[#1F1410] placeholder:text-[#1F1410]/30"
                    />
                  </div>
                </div>

                {/* Target Date */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#1F1410]/70 mb-2">
                    <Calendar className="w-4 h-4" />
                    Target Date
                  </label>
                  <DatePicker
                    value={targetDate}
                    onChange={setTargetDate}
                    min={new Date().toISOString().split('T')[0]}
                    placeholder="Select target date"
                  />
                </div>

                {/* Linked Categories */}
                {availableCategories.length > 0 && (
                  <div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-[#1F1410]/70 mb-2">
                      <Link2 className="w-4 h-4" />
                      Linked Categories
                    </label>
                    <p className="text-xs text-[#1F1410]/40 mb-3">
                      Expenses in these categories will be linked to this goal and excluded from your budget.
                    </p>

                    {/* Selected categories */}
                    {linkedCategories.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {linkedCategories.map(lc => {
                          const cat = availableCategories.find(c => c.id === lc.categoryId)
                          if (!cat) return null
                          const CatIcon = getIcon(cat.icon)
                          return (
                            <div
                              key={lc.categoryId}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#1F1410]/10 bg-white"
                            >
                              <CatIcon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                              <span className="text-xs font-medium text-[#1F1410]">{cat.name}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkedCategories(prev =>
                                    prev.map(p =>
                                      p.categoryId === lc.categoryId
                                        ? { ...p, autoTag: !p.autoTag }
                                        : p
                                    )
                                  )
                                }}
                                className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                                  lc.autoTag
                                    ? 'bg-[#14B8A6]/15 text-[#14B8A6]'
                                    : 'bg-[#1F1410]/5 text-[#1F1410]/40'
                                }`}
                              >
                                {lc.autoTag ? 'Auto' : 'Manual'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkedCategories(prev =>
                                    prev.filter(p => p.categoryId !== lc.categoryId)
                                  )
                                }}
                                className="ml-0.5 text-[#1F1410]/30 hover:text-red-500 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Add category button / dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsCategoryPickerOpen(!isCategoryPickerOpen)}
                        className="w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-[#1F1410]/10 text-sm text-[#1F1410]/40 hover:border-[#1F1410]/20 hover:text-[#1F1410]/60 transition-all"
                      >
                        + Add category
                      </button>

                      {isCategoryPickerOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-[#1F1410]/10 shadow-xl max-h-48 overflow-y-auto z-50">
                          {availableCategories
                            .filter(c => !linkedCategories.some(lc => lc.categoryId === c.id))
                            .map(cat => {
                              const CatIcon = getIcon(cat.icon)
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    setLinkedCategories(prev => [
                                      ...prev,
                                      { categoryId: cat.id, autoTag: true },
                                    ])
                                    setIsCategoryPickerOpen(false)
                                  }}
                                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#1F1410]/5 transition-colors text-left"
                                >
                                  <div
                                    className="w-5 h-5 rounded-md flex items-center justify-center"
                                    style={{ backgroundColor: `${cat.color}15` }}
                                  >
                                    <CatIcon className="w-3 h-3" style={{ color: cat.color }} />
                                  </div>
                                  <span className="text-sm text-[#1F1410]">{cat.name}</span>
                                </button>
                              )
                            })}
                          {availableCategories.filter(c => !linkedCategories.some(lc => lc.categoryId === c.id)).length === 0 && (
                            <p className="text-xs text-[#1F1410]/40 py-3 text-center">All categories linked</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Auto-Contribute Section (only for edit mode on existing goals that have it) */}
                {isEditMode && editingGoal?.autoContribute !== undefined && (
                  <div className="p-4 rounded-xl bg-[#6366F1]/5 border border-[#6366F1]/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-[#6366F1]" />
                        <span className="text-sm font-semibold text-[#1F1410]/70">
                          Auto-contribute from paychecks
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoContribute(!autoContribute)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${
                          autoContribute ? 'bg-[#6366F1]' : 'bg-[#1F1410]/20'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                            autoContribute ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {autoContribute && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <label className="text-xs text-[#1F1410]/50 mb-1.5 block">
                          Link to paycheck deduction
                        </label>
                        <select
                          value={contributionField}
                          onChange={(e) => setContributionField(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none text-sm text-[#1F1410] bg-white"
                        >
                          <option value="">Select a field...</option>
                          {PAYSTUB_CONTRIBUTION_FIELDS.map((field) => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-[#1F1410]/40 mt-2">
                          When you import a paycheck, contributions from this field will automatically be added to this goal.
                        </p>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Summary */}
                {goalName && targetAmount && parseFloat(targetAmount) > 0 && targetDate && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: `${goalColor}08` }}
                  >
                    <p className="text-sm text-[#1F1410]/60 mb-1">You'll need to save approximately:</p>
                    <p className="text-2xl font-bold" style={{ color: goalColor }}>
                      ${Math.round(parseFloat(targetAmount) / getMonthsUntilTarget()).toLocaleString()}
                      <span className="text-base font-medium text-[#1F1410]/50"> / month</span>
                    </p>
                    <p className="text-xs text-[#1F1410]/40 mt-1">
                      {getMonthsUntilTarget()} months until {new Date(targetDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Actions */}
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!goalName.trim() || !targetAmount || parseFloat(targetAmount) <= 0}
                  className="flex-1 px-4 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: goalColor, boxShadow: `0 2px 8px ${goalColor}40` }}
                >
                  {isEditMode ? 'Save Changes' : 'Create Goal'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
