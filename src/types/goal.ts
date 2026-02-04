/**
 * Goal/Savings target type definitions
 * Maps to the Supabase goals table schema
 */

import type { LucideIcon } from 'lucide-react'

/**
 * Goal type from database
 */
export type Goal = {
  id: string
  user_id: string
  name: string
  target_amount: number
  current_amount: number
  deadline: string | null
  goal_type: 'savings' | 'debt' | 'investment' | 'emergency' | 'retirement' | 'other'
  icon: string
  color: string
  is_active: boolean
  monthly_budget: number | null
  created_at: string
  updated_at: string
}

/**
 * UI goal type for component rendering
 */
export type GoalUI = {
  id: string
  name: string
  icon: LucideIcon
  color: string
  targetAmount: number
  currentAmount: number
  monthlyBudget: number
  deadline: Date | null
  progress: number
}

/**
 * Active goal with contribution data for savings view
 */
export type ActiveGoal = {
  id: string
  name: string
  icon: LucideIcon
  color: string
  targetAmount: number
  currentAmount: number
  monthlyBudget: number
  deadline: Date | null
  progress: number
  monthlyProgress: number
  remainingMonthly: number
  daysRemaining: number | null
  monthsRemaining: number | null
  onTrack: boolean
  thisMonthContributions: number
}

/**
 * Goal contribution from database
 */
export type GoalContribution = {
  id: string
  goal_id: string
  amount: number
  contribution_date: string
  source: 'manual' | 'paystub' | 'transfer' | 'interest' | 'rsu_vest' | 'espp_purchase'
  paystub_id: string | null
  rsu_vest_id: string | null
  notes: string | null
  created_at: string
}

/**
 * Input type for creating a new goal
 */
export type GoalInsert = Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'> & {
  id?: string
  user_id?: string
}

/**
 * Input type for updating a goal
 */
export type GoalUpdate = Partial<Omit<Goal, 'id' | 'user_id'>> & {
  id: string
}

/**
 * Input type for creating a goal contribution
 */
export type GoalContributionInsert = Omit<GoalContribution, 'id' | 'created_at'>
