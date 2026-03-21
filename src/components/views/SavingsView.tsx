import { useState, useEffect, useCallback } from 'react'
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
  Pencil,
  Trash2,
  LucideIcon,
  Loader2,
  Building2,
  Tag,
} from 'lucide-react'
import { GoalCustomizationModal } from '../modals/GoalCustomizationModal'
import { GoalContributionHistory } from '../common/GoalContributionHistory'
import { GoalSpendingHistory } from '../common/GoalSpendingHistory'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useCategories } from '../../hooks/useCategories'
import { useGoalCategories } from '../../hooks/useGoalCategories'

// Map icon names to Lucide components (for editing existing goals)
const iconNameToComponent: Record<string, LucideIcon> = {
  Shield,
  Heart,
  Home,
  Plane,
  Car,
  GraduationCap,
  TrendingUp,
  Sparkles,
  PiggyBank,
  Building2,
}

type ActiveGoal = {
  id: string
  name: string
  tag: string
  icon: LucideIcon
  color: string
  currentAmount: number
  targetAmount: number
  targetDate: Date
  monthlyTarget: number
  status: 'on-track' | 'ahead' | 'behind'
  autoContribute: boolean
  contributionField: string | null
}

type DbGoal = {
  id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  goal_type: string
  icon: string
  color: string
  is_active: boolean
  auto_contribute: boolean
  contribution_field: string | null
}

function nameToTag(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

// Convert database goal to ActiveGoal for display
const dbGoalToActiveGoal = (dbGoal: DbGoal): ActiveGoal => {
  const targetDate = dbGoal.deadline ? new Date(dbGoal.deadline) : new Date()
  const now = new Date()
  const monthsUntilTarget = (targetDate.getFullYear() - now.getFullYear()) * 12 +
    (targetDate.getMonth() - now.getMonth())
  const monthlyTarget = monthsUntilTarget > 0
    ? Math.round(Number(dbGoal.target_amount) / monthsUntilTarget)
    : Number(dbGoal.target_amount)

  // Calculate status based on progress
  const progressRatio = Number(dbGoal.current_amount) / Number(dbGoal.target_amount)
  const timeRatio = dbGoal.deadline
    ? 1 - (monthsUntilTarget / 12) // Rough estimate assuming 12 month goals
    : 0.5

  let status: 'on-track' | 'ahead' | 'behind' = 'on-track'
  if (progressRatio > timeRatio + 0.1) status = 'ahead'
  else if (progressRatio < timeRatio - 0.1) status = 'behind'

  return {
    id: dbGoal.id,
    name: dbGoal.name,
    tag: nameToTag(dbGoal.name),
    icon: iconNameToComponent[dbGoal.icon] || PiggyBank,
    color: dbGoal.color,
    currentAmount: Number(dbGoal.current_amount),
    targetAmount: Number(dbGoal.target_amount),
    targetDate,
    monthlyTarget,
    status,
    autoContribute: dbGoal.auto_contribute,
    contributionField: dbGoal.contribution_field,
  }
}

export function SavingsView() {
  const { user } = useAuth()
  const { needCategories, wantCategories } = useCategories()
  const { getCategoriesForGoal, setCategoriesForGoal } = useGoalCategories()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeGoals, setActiveGoals] = useState<ActiveGoal[]>([])
  const [editingGoal, setEditingGoal] = useState<ActiveGoal | null>(null)
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch goals from database
  const fetchGoals = useCallback(async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('goals')
      .select('id, name, target_amount, current_amount, deadline, goal_type, icon, color, is_active, auto_contribute, contribution_field')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching goals:', error)
    } else if (data) {
      setActiveGoals(data.map(dbGoalToActiveGoal))
    }
    setIsLoading(false)
  }, [])

  // Fetch goals on mount
  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const handleSaveGoal = async (customizedGoal: {
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
    linkedCategories?: { categoryId: string; autoTag: boolean }[]
  }) => {
    const deadlineStr = customizedGoal.targetDate.toISOString().split('T')[0]

    if (customizedGoal.id) {
      // Edit mode: update existing goal in database
      const { error } = await supabase
        .from('goals')
        .update({
          name: customizedGoal.name,
          target_amount: customizedGoal.amount,
          deadline: deadlineStr,
          auto_contribute: customizedGoal.autoContribute ?? false,
          contribution_field: customizedGoal.contributionField ?? null,
        })
        .eq('id', customizedGoal.id)

      if (error) {
        console.error('Error updating goal:', error)
      } else {
        // Save linked categories
        if (customizedGoal.linkedCategories) {
          await setCategoriesForGoal(customizedGoal.id, customizedGoal.linkedCategories)
        }
        await fetchGoals()
      }
      setEditingGoal(null)
    } else {
      // Create mode: insert new goal into database
      if (!user) {
        console.error('No user logged in')
        return
      }

      const { data, error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          name: customizedGoal.name,
          target_amount: customizedGoal.amount,
          current_amount: 0,
          deadline: deadlineStr,
          goal_type: customizedGoal.goalType,
          icon: customizedGoal.icon,
          color: customizedGoal.color,
          is_active: true,
          auto_contribute: customizedGoal.autoContribute ?? false,
          contribution_field: customizedGoal.contributionField ?? null,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creating goal:', error)
      } else if (data) {
        // Save linked categories for the new goal
        if (customizedGoal.linkedCategories && customizedGoal.linkedCategories.length > 0) {
          await setCategoriesForGoal(data.id, customizedGoal.linkedCategories)
        }
        await fetchGoals()
      }
    }
  }

  const handleAddGoal = () => {
    setEditingGoal(null)
    setIsModalOpen(true)
  }

  const handleEditGoal = (goal: ActiveGoal) => {
    setEditingGoal(goal)
    setIsModalOpen(true)
  }

  const handleDeleteGoal = async (goalId: string) => {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', goalId)

    if (error) {
      console.error('Error deleting goal:', error)
    } else {
      setActiveGoals(prev => prev.filter(goal => goal.id !== goalId))
    }
    setDeletingGoalId(null)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingGoal(null)
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
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Savings</h1>
          </div>
        </motion.div>

        {/* Active Goals */}
        {isLoading ? (
          <div className="mb-8 flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#38BDF8] animate-spin" />
          </div>
        ) : (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1F1410]">Active Goals</h2>
              <button
                onClick={handleAddGoal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#1F1410]/60 hover:text-[#1F1410] hover:bg-[#1F1410]/5 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Goal
              </button>
            </div>
            {activeGoals.length === 0 && (
              <p className="text-[#1F1410]/50 text-sm">No active goals yet. Click "Add Goal" to create one.</p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {activeGoals.map((goal) => {
                const Icon = goal.icon
                const StatusIcon = getStatusIcon(goal.status)
                const statusColor = getStatusColor(goal.status)
                const remaining = goal.targetAmount - goal.currentAmount
                return (
                  <div
                    key={goal.id}
                    className="bg-white rounded-2xl p-6 border border-[#1F1410]/5"
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
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#1F1410]/40" />
                              <span className="text-xs text-[#1F1410]/50">
                                Target: {goal.targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                          {/* Tag pill */}
                          {goal.tag && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <Tag className="w-3 h-3" style={{ color: goal.color }} />
                              <span
                                className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                                style={{ backgroundColor: `${goal.color}15`, color: goal.color }}
                              >
                                {goal.tag}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditGoal(goal)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1F1410]/5 transition-colors"
                          title="Edit goal"
                        >
                          <Pencil className="w-4 h-4 text-[#1F1410]/40 hover:text-[#1F1410]/60" />
                        </button>
                        <button
                          onClick={() => setDeletingGoalId(goal.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                          title="Delete goal"
                        >
                          <Trash2 className="w-4 h-4 text-[#1F1410]/40 hover:text-red-500" />
                        </button>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-1.5 mb-4">
                      <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
                      <span className="text-xs font-semibold" style={{ color: statusColor }}>
                        {getStatusText(goal.status)}
                      </span>
                    </div>

                    {/* Progress Amount */}
                    <div className="mb-3">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-3xl font-light text-[#1F1410]">${goal.currentAmount.toLocaleString()}</span>
                        <span className="text-sm text-[#1F1410]/50">of ${goal.targetAmount.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-[#1F1410]/40">${remaining.toLocaleString()} remaining</p>
                    </div>

                    {/* Remaining metric */}
                    <div className="mb-4">
                      <p className="text-sm font-medium" style={{ color: goal.color }}>
                        ${remaining.toLocaleString()} remaining
                      </p>
                    </div>

                    {/* Status Message */}
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${statusColor}08` }}>
                      <p className="text-xs text-[#1F1410]/70">
                        {goal.status === 'ahead' && <>You're ahead of schedule! Keep up the great work.</>}
                        {goal.status === 'on-track' && <>You're on track to reach your goal by {goal.targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.</>}
                        {goal.status === 'behind' && <>Consider increasing monthly contributions to stay on track.</>}
                      </p>
                    </div>

                    {/* Contribution History */}
                    <GoalContributionHistory goalId={goal.id} goalColor={goal.color} />

                    {/* Goal Spending (expenses linked to this goal) */}
                    <GoalSpendingHistory goalId={goal.id} goalColor={goal.color} />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Goal Customization Modal */}
      <GoalCustomizationModal
        isOpen={isModalOpen}
        editingGoal={editingGoal ? {
          id: editingGoal.id,
          name: editingGoal.name,
          currentAmount: editingGoal.currentAmount,
          targetAmount: editingGoal.targetAmount,
          targetDate: editingGoal.targetDate,
          autoContribute: editingGoal.autoContribute,
          contributionField: editingGoal.contributionField,
          linkedCategories: getCategoriesForGoal(editingGoal.id).map(gc => ({
            categoryId: gc.category_id,
            autoTag: gc.auto_tag,
          })),
        } : null}
        availableCategories={[...needCategories, ...wantCategories].map(c => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          color: c.color,
        }))}
        onClose={handleCloseModal}
        onSave={handleSaveGoal}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingGoalId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDeletingGoalId(null)}
              className="fixed inset-0 bg-[#1F1410]/40 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1F1410]">Delete Goal</h3>
                    <p className="text-sm text-[#1F1410]/60">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-sm text-[#1F1410]/70 mb-6">
                  Are you sure you want to delete this savings goal? All progress tracking will be lost.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingGoalId(null)}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDeleteGoal(deletingGoalId)}
                    className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
