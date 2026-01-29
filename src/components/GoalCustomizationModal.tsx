import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, DollarSign, Target, LucideIcon } from 'lucide-react'

type GoalTemplate = {
  id: string
  name: string
  icon: LucideIcon
  color: string
  suggestedAmount: number
  description: string
}

type GoalCustomizationModalProps = {
  isOpen: boolean
  goal: GoalTemplate | null
  onClose: () => void
  onSave: (customizedGoal: {
    name: string
    amount: number
    targetYear: number
    template: GoalTemplate
  }) => void
}

export function GoalCustomizationModal({ isOpen, goal, onClose, onSave }: GoalCustomizationModalProps) {
  const [goalName, setGoalName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [targetYear, setTargetYear] = useState(new Date().getFullYear() + 1)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 12 }, (_, i) => currentYear + i)

  useEffect(() => {
    if (goal) {
      setGoalName(goal.name)
      setTargetAmount(goal.suggestedAmount > 0 ? goal.suggestedAmount.toString() : '')
      setTargetYear(currentYear + 1)
    }
  }, [goal, currentYear])

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
    if (goal && goalName.trim() && targetAmount && parseFloat(targetAmount) > 0) {
      onSave({
        name: goalName.trim(),
        amount: parseFloat(targetAmount),
        targetYear,
        template: goal,
      })
      onClose()
    }
  }

  if (!goal) return null

  const Icon = goal.icon

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
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-[#1F1410]/10" style={{ backgroundColor: `${goal.color}05` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${goal.color}15` }}
                    >
                      <Icon className="w-7 h-7" style={{ color: goal.color }} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[#1F1410]">Customize Your Goal</h2>
                      <p className="text-sm text-[#1F1410]/60 mt-0.5">{goal.description}</p>
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

                {/* Target Year */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-[#1F1410]/70 mb-2">
                    <Calendar className="w-4 h-4" />
                    Target Year
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {years.map((year) => (
                      <motion.button
                        key={year}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTargetYear(year)}
                        className="py-2.5 rounded-lg font-medium text-sm transition-all"
                        style={{
                          backgroundColor: targetYear === year ? `${goal.color}15` : 'rgba(31, 20, 16, 0.05)',
                          color: targetYear === year ? goal.color : 'rgba(31, 20, 16, 0.6)',
                          border: `2px solid ${targetYear === year ? goal.color : 'transparent'}`,
                        }}
                      >
                        {year}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                {goalName && targetAmount && parseFloat(targetAmount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: `${goal.color}08` }}
                  >
                    <p className="text-sm text-[#1F1410]/60 mb-1">You'll need to save approximately:</p>
                    <p className="text-2xl font-bold" style={{ color: goal.color }}>
                      ${Math.round(parseFloat(targetAmount) / ((targetYear - currentYear) * 12)).toLocaleString()}
                      <span className="text-base font-medium text-[#1F1410]/50"> / month</span>
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
                  style={{ backgroundColor: goal.color, boxShadow: `0 2px 8px ${goal.color}40` }}
                >
                  Create Goal
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
