import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  DollarSign,
  Target,
  LucideIcon,
  Zap,
  ChevronLeft,
  Shield,
  Heart,
  Home,
  Plane,
  Car,
  GraduationCap,
  TrendingUp,
  Sparkles,
} from 'lucide-react'

type GoalTemplate = {
  id: string
  name: string
  icon: LucideIcon
  iconName: string
  color: string
  suggestedAmount: number
  description: string
  goalType: string
}

const goalTemplates: GoalTemplate[] = [
  { id: 'emergency', name: 'Emergency Fund', icon: Shield, iconName: 'Shield', color: '#10B981', suggestedAmount: 10000, description: '3-6 months of expenses', goalType: 'emergency_fund' },
  { id: 'wedding', name: 'Wedding', icon: Heart, iconName: 'Heart', color: '#EC4899', suggestedAmount: 25000, description: 'Your special day', goalType: 'wedding' },
  { id: 'house', name: 'House Down Payment', icon: Home, iconName: 'Home', color: '#F59E0B', suggestedAmount: 50000, description: '20% down payment', goalType: 'home' },
  { id: 'vacation', name: 'Dream Vacation', icon: Plane, iconName: 'Plane', color: '#38BDF8', suggestedAmount: 5000, description: 'Travel the world', goalType: 'vacation' },
  { id: 'car', name: 'New Car', icon: Car, iconName: 'Car', color: '#6366F1', suggestedAmount: 30000, description: 'Upgrade your ride', goalType: 'car' },
  { id: 'education', name: 'Education', icon: GraduationCap, iconName: 'GraduationCap', color: '#8B5CF6', suggestedAmount: 20000, description: 'Invest in learning', goalType: 'education' },
  { id: 'retirement', name: 'Retirement', icon: TrendingUp, iconName: 'TrendingUp', color: '#A855F7', suggestedAmount: 100000, description: 'Secure your future', goalType: 'retirement_401k' },
  { id: 'custom', name: 'Custom Goal', icon: Sparkles, iconName: 'Sparkles', color: '#FF6B6B', suggestedAmount: 0, description: 'Create your own', goalType: 'custom' },
]

// Paystub fields that can be linked to auto-contributions
const PAYSTUB_CONTRIBUTION_FIELDS = [
  { value: 'traditional_401k', label: '401(k) Contribution' },
  { value: 'roth_401k', label: 'Roth 401(k) Contribution' },
  { value: 'after_tax_401k', label: 'After-Tax 401(k)' },
  { value: 'espp_contribution', label: 'ESPP Contribution' },
  { value: 'hsa_contribution', label: 'HSA Contribution' },
]

// Goal types that support auto-contribution from paystubs
const AUTO_CONTRIBUTE_GOAL_TYPES = [
  'retirement_401k',
  'retirement_ira',
  'espp',
  'hsa',
]

type EditingGoal = {
  id: string
  name: string
  currentAmount: number
  targetAmount: number
  targetDate: Date
  autoContribute?: boolean
  contributionField?: string | null
}

type GoalCustomizationModalProps = {
  isOpen: boolean
  goal?: GoalTemplate | null
  editingGoal?: EditingGoal | null
  onClose: () => void
  onSave: (customizedGoal: {
    id?: string
    name: string
    amount: number
    currentAmount?: number
    targetDate: Date
    template: GoalTemplate
    autoContribute?: boolean
    contributionField?: string | null
  }) => void
}

export function GoalCustomizationModal({ isOpen, goal: initialGoal, editingGoal, onClose, onSave }: GoalCustomizationModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<GoalTemplate | null>(initialGoal || null)
  const [goalName, setGoalName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [autoContribute, setAutoContribute] = useState(false)
  const [contributionField, setContributionField] = useState('')

  const isEditMode = !!editingGoal
  const showTemplateSelection = !isEditMode && !selectedTemplate
  const supportsAutoContribute = selectedTemplate && AUTO_CONTRIBUTE_GOAL_TYPES.includes(selectedTemplate.goalType)

  // Set default date to 1 year from now
  const getDefaultDate = () => {
    const date = new Date()
    date.setFullYear(date.getFullYear() + 1)
    return date.toISOString().split('T')[0]
  }

  // Format date to YYYY-MM-DD for input
  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0]
  }

  // Reset template selection when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate(initialGoal || null)
    } else {
      // Reset form when modal closes
      setSelectedTemplate(null)
      setGoalName('')
      setTargetAmount('')
      setTargetDate('')
      setAutoContribute(false)
      setContributionField('')
    }
  }, [isOpen, initialGoal])

  useEffect(() => {
    if (editingGoal) {
      // Edit mode: pre-fill with existing goal data
      setGoalName(editingGoal.name)
      setTargetAmount(editingGoal.targetAmount.toString())
      setTargetDate(formatDateForInput(editingGoal.targetDate))
      setAutoContribute(editingGoal.autoContribute ?? false)
      setContributionField(editingGoal.contributionField ?? '')
    } else if (selectedTemplate) {
      // Create mode: use template defaults
      setGoalName(selectedTemplate.name)
      setTargetAmount(selectedTemplate.suggestedAmount > 0 ? selectedTemplate.suggestedAmount.toString() : '')
      setTargetDate(getDefaultDate())
      // Set default contribution field based on goal type
      setAutoContribute(false)
      if (selectedTemplate.goalType === 'retirement_401k') {
        setContributionField('traditional_401k')
      } else if (selectedTemplate.goalType === 'espp') {
        setContributionField('espp_contribution')
      } else if (selectedTemplate.goalType === 'hsa') {
        setContributionField('hsa_contribution')
      } else {
        setContributionField('')
      }
    }
  }, [selectedTemplate, editingGoal])

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
    if (selectedTemplate && goalName.trim() && targetAmount && parseFloat(targetAmount) > 0 && targetDate) {
      onSave({
        id: editingGoal?.id,
        name: goalName.trim(),
        amount: parseFloat(targetAmount),
        currentAmount: editingGoal?.currentAmount,
        targetDate: new Date(targetDate),
        template: selectedTemplate,
        autoContribute: supportsAutoContribute ? autoContribute : false,
        contributionField: supportsAutoContribute && autoContribute ? contributionField : null,
      })
      onClose()
    }
  }

  const handleBack = () => {
    setSelectedTemplate(null)
  }

  // Calculate months until target for summary display
  const getMonthsUntilTarget = () => {
    if (!targetDate) return 0
    const target = new Date(targetDate)
    const now = new Date()
    const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
    return Math.max(1, months)
  }

  const Icon = selectedTemplate?.icon

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
              {/* Template Selection View */}
              {showTemplateSelection ? (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-[#1F1410]/10">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-[#1F1410]">Create a Savings Goal</h2>
                        <p className="text-sm text-[#1F1410]/60 mt-0.5">Choose a goal type to get started</p>
                      </div>
                      <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1F1410]/5 transition-colors"
                      >
                        <X className="w-5 h-5 text-[#1F1410]/60" />
                      </button>
                    </div>
                  </div>

                  {/* Template Grid */}
                  <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-3">
                      {goalTemplates.map((template) => {
                        const TemplateIcon = template.icon
                        return (
                          <button
                            key={template.id}
                            onClick={() => setSelectedTemplate(template)}
                            className="p-4 rounded-xl border-2 border-[#1F1410]/10 hover:border-[#1F1410]/20 hover:bg-[#1F1410]/[0.02] transition-all text-left group"
                          >
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                              style={{ backgroundColor: `${template.color}15` }}
                            >
                              <TemplateIcon className="w-5 h-5" style={{ color: template.color }} />
                            </div>
                            <h3 className="font-semibold text-[#1F1410] mb-0.5">{template.name}</h3>
                            <p className="text-xs text-[#1F1410]/50">{template.description}</p>
                            {template.suggestedAmount > 0 && (
                              <p className="text-sm font-semibold mt-2" style={{ color: template.color }}>
                                ${template.suggestedAmount.toLocaleString()}
                              </p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              ) : selectedTemplate && Icon ? (
                <>
                  {/* Customization Header */}
                  <div className="p-6 border-b border-[#1F1410]/10" style={{ backgroundColor: `${selectedTemplate.color}05` }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        {!isEditMode && (
                          <button
                            onClick={handleBack}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1F1410]/5 transition-colors -ml-1"
                          >
                            <ChevronLeft className="w-5 h-5 text-[#1F1410]/60" />
                          </button>
                        )}
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${selectedTemplate.color}15` }}
                        >
                          <Icon className="w-7 h-7" style={{ color: selectedTemplate.color }} />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-[#1F1410]">
                            {isEditMode ? 'Edit Goal' : 'Customize Your Goal'}
                          </h2>
                          <p className="text-sm text-[#1F1410]/60 mt-0.5">{selectedTemplate.description}</p>
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
              <div className="p-6 space-y-5">
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
                    placeholder="e.g., Dream Wedding"
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#1F1410]/10 focus:border-[#1F1410]/20 focus:outline-none focus:ring-4 focus:ring-[#1F1410]/5 transition-all text-[#1F1410] placeholder:text-[#1F1410]/30"
                  />
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
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#1F1410]/10 focus:border-[#1F1410]/20 focus:outline-none focus:ring-4 focus:ring-[#1F1410]/5 transition-all text-[#1F1410]"
                  />
                </div>

                {/* Auto-Contribute Section (only for eligible goal types) */}
                {supportsAutoContribute && (
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
                    style={{ backgroundColor: `${selectedTemplate.color}08` }}
                  >
                    <p className="text-sm text-[#1F1410]/60 mb-1">You'll need to save approximately:</p>
                    <p className="text-2xl font-bold" style={{ color: selectedTemplate.color }}>
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
                  style={{ backgroundColor: selectedTemplate.color, boxShadow: `0 2px 8px ${selectedTemplate.color}40` }}
                >
                  {isEditMode ? 'Save Changes' : 'Create Goal'}
                </motion.button>
              </div>
                </>
              ) : null}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
