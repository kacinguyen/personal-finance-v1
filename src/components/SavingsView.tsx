import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PiggyBank,
  Shield,
  Heart,
  Home,
  Plane,
  Car,
  GraduationCap,
  TrendingUp,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Calendar,
  Plus,
  ChevronDown,
  LucideIcon,
} from 'lucide-react'
import { GoalCustomizationModal } from './GoalCustomizationModal'

type GoalTemplate = {
  id: string
  name: string
  icon: LucideIcon
  color: string
  suggestedAmount: number
  description: string
}

type ActiveGoal = {
  id: string
  name: string
  icon: LucideIcon
  color: string
  currentAmount: number
  targetAmount: number
  targetYear: number
  monthlyTarget: number
  status: 'on-track' | 'ahead' | 'behind'
}

const goalTemplates: GoalTemplate[] = [
  { id: 'emergency', name: 'Emergency Fund', icon: Shield, color: '#10B981', suggestedAmount: 10000, description: '3-6 months of expenses' },
  { id: 'wedding', name: 'Wedding', icon: Heart, color: '#EC4899', suggestedAmount: 25000, description: 'Your special day' },
  { id: 'house', name: 'House Down Payment', icon: Home, color: '#F59E0B', suggestedAmount: 50000, description: '20% down payment' },
  { id: 'vacation', name: 'Dream Vacation', icon: Plane, color: '#38BDF8', suggestedAmount: 5000, description: 'Travel the world' },
  { id: 'car', name: 'New Car', icon: Car, color: '#6366F1', suggestedAmount: 30000, description: 'Upgrade your ride' },
  { id: 'education', name: 'Education', icon: GraduationCap, color: '#8B5CF6', suggestedAmount: 20000, description: 'Invest in learning' },
  { id: 'retirement', name: 'Retirement', icon: TrendingUp, color: '#A855F7', suggestedAmount: 100000, description: 'Secure your future' },
  { id: 'custom', name: 'Custom Goal', icon: Sparkles, color: '#FF6B6B', suggestedAmount: 0, description: 'Create your own' },
]

export function SavingsView() {
  const [selectedGoal, setSelectedGoal] = useState<GoalTemplate | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)

  const activeGoals: ActiveGoal[] = [
    { id: '1', name: 'Emergency Fund', icon: Shield, color: '#10B981', currentAmount: 6500, targetAmount: 10000, targetYear: 2025, monthlyTarget: 417, status: 'on-track' },
    { id: '2', name: 'Dream Vacation', icon: Plane, color: '#38BDF8', currentAmount: 2800, targetAmount: 5000, targetYear: 2024, monthlyTarget: 200, status: 'ahead' },
  ]

  const handleSelectGoal = (goal: GoalTemplate) => {
    setSelectedGoal(goal)
    setIsModalOpen(true)
  }

  const handleSaveGoal = (customizedGoal: { name: string; amount: number; targetYear: number; template: GoalTemplate }) => {
    console.log('Saved goal:', customizedGoal)
  }

  const getStatusColor = (status: ActiveGoal['status']) => {
    switch (status) {
      case 'on-track': return '#F59E0B'
      case 'ahead': return '#10B981'
      case 'behind': return '#FF6B6B'
    }
  }

  const getStatusText = (status: ActiveGoal['status']) => {
    switch (status) {
      case 'on-track': return 'On Track'
      case 'ahead': return 'Ahead of Schedule'
      case 'behind': return 'Behind Schedule'
    }
  }

  const getStatusIcon = (status: ActiveGoal['status']) => {
    return status === 'behind' ? AlertCircle : CheckCircle
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-12 h-12 rounded-xl bg-[#38BDF8]/10 flex items-center justify-center"
            >
              <PiggyBank className="w-6 h-6 text-[#38BDF8]" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Savings</h1>
          </div>
          <p className="text-[#1F1410]/60 text-lg">Track your progress and create new savings goals</p>
        </motion.div>

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-[#1F1410] mb-4">Active Goals</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeGoals.map((goal, index) => {
                const Icon = goal.icon
                const StatusIcon = getStatusIcon(goal.status)
                const statusColor = getStatusColor(goal.status)
                const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100
                const remaining = goal.targetAmount - goal.currentAmount
                return (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + index * 0.1, duration: 0.4 }}
                    className="bg-white rounded-2xl p-6 shadow-sm"
                    style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
                  >
                    {/* Goal Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${goal.color}15` }}
                        >
                          <Icon className="w-6 h-6" style={{ color: goal.color }} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-[#1F1410]">{goal.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-[#1F1410]/40" />
                            <span className="text-xs text-[#1F1410]/50">Target: {goal.targetYear}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
                        <span className="text-xs font-semibold" style={{ color: statusColor }}>
                          {getStatusText(goal.status)}
                        </span>
                      </div>
                    </div>

                    {/* Progress Amount */}
                    <div className="mb-3">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-bold text-[#1F1410]">${goal.currentAmount.toLocaleString()}</span>
                        <span className="text-sm text-[#1F1410]/50">of ${goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-[#1F1410]/40">${remaining.toLocaleString()} remaining</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-[#1F1410]/50 mb-2">
                        <span>{Math.round(progressPercentage)}% complete</span>
                        <span>${goal.monthlyTarget.toLocaleString()}/month</span>
                      </div>
                      <div className="h-2.5 bg-[#1F1410]/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(progressPercentage, 100)}%` }}
                          transition={{ delay: 0.5 + index * 0.1, duration: 1, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: goal.color }}
                        />
                      </div>
                    </div>

                    {/* Status Message */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${statusColor}08` }}>
                      <p className="text-xs text-[#1F1410]/70">
                        {goal.status === 'ahead' && <>You're ahead of schedule! Keep up the great work.</>}
                        {goal.status === 'on-track' && <>You're on track to reach your goal by {goal.targetYear}.</>}
                        {goal.status === 'behind' && <>Consider increasing monthly contributions to stay on track.</>}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Create New Goal Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => setShowTemplates(!showTemplates)}
            className="w-full p-4 bg-white rounded-xl border-2 border-[#1F1410]/10 hover:border-[#38BDF8]/30 transition-all flex items-center justify-between"
            style={{ boxShadow: '0 2px 8px rgba(31, 20, 16, 0.04)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#38BDF8]/10 flex items-center justify-center">
                <Plus className="w-5 h-5 text-[#38BDF8]" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-[#1F1410]">Create New Goal</p>
                <p className="text-xs text-[#1F1410]/50">Choose from templates or create custom</p>
              </div>
            </div>
            <motion.div animate={{ rotate: showTemplates ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDown className="w-5 h-5 text-[#1F1410]/40" />
            </motion.div>
          </motion.button>
        </motion.div>

        {/* Goal Templates Section - Collapsible */}
        <AnimatePresence>
          {showTemplates && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {goalTemplates.map((goal, index) => {
                  const Icon = goal.icon
                  return (
                    <motion.button
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelectGoal(goal)}
                      className="bg-white p-6 rounded-2xl border-2 border-[#1F1410]/10 hover:border-[#1F1410]/20 transition-all text-left"
                      style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
                    >
                      <motion.div
                        whileHover={{ rotate: 5, scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                        style={{ backgroundColor: `${goal.color}15` }}
                      >
                        <Icon className="w-7 h-7" style={{ color: goal.color }} />
                      </motion.div>
                      <h3 className="font-bold text-lg text-[#1F1410] mb-1">{goal.name}</h3>
                      <p className="text-sm text-[#1F1410]/50 mb-3">{goal.description}</p>
                      {goal.suggestedAmount > 0 && (
                        <p className="text-base font-semibold" style={{ color: goal.color }}>
                          ${goal.suggestedAmount.toLocaleString()}
                        </p>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Goal Customization Modal */}
      <GoalCustomizationModal
        isOpen={isModalOpen}
        goal={selectedGoal}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveGoal}
      />
    </div>
  )
}
