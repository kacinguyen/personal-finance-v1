import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { GoalCategory } from '../types/goalCategory'
import { useUser } from './useUser'

type UseGoalCategoriesReturn = {
  goalCategories: GoalCategory[]
  loading: boolean
  error: string | null
  addCategoryToGoal: (goalId: string, categoryId: string, autoTag: boolean) => Promise<GoalCategory | null>
  removeCategoryFromGoal: (goalId: string, categoryId: string) => Promise<boolean>
  updateAutoTag: (goalId: string, categoryId: string, autoTag: boolean) => Promise<boolean>
  setCategoriesForGoal: (goalId: string, entries: { categoryId: string; autoTag: boolean }[]) => Promise<boolean>
  getCategoriesForGoal: (goalId: string) => GoalCategory[]
  getGoalForCategory: (categoryId: string) => string | null
  refetch: () => Promise<void>
}

export function useGoalCategories(): UseGoalCategoriesReturn {
  const { userId } = useUser()
  const [goalCategories, setGoalCategories] = useState<GoalCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoalCategories = useCallback(async () => {
    if (!userId) {
      setGoalCategories([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('goal_categories')
      .select('*')
      .order('created_at')

    if (fetchError) {
      console.error('Error fetching goal categories:', fetchError)
      setError(fetchError.message)
      setGoalCategories([])
    } else {
      setGoalCategories(data as GoalCategory[])
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGoalCategories()
  }, [fetchGoalCategories])

  const addCategoryToGoal = useCallback(async (
    goalId: string,
    categoryId: string,
    autoTag: boolean
  ): Promise<GoalCategory | null> => {
    if (!userId) return null

    const { data, error: insertError } = await supabase
      .from('goal_categories')
      .insert({ goal_id: goalId, category_id: categoryId, user_id: userId, auto_tag: autoTag })
      .select()
      .single()

    if (insertError) {
      console.error('Error adding category to goal:', insertError)
      setError(insertError.message)
      return null
    }

    const newEntry = data as GoalCategory
    setGoalCategories(prev => [...prev, newEntry])
    return newEntry
  }, [userId])

  const removeCategoryFromGoal = useCallback(async (
    goalId: string,
    categoryId: string
  ): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('goal_categories')
      .delete()
      .eq('goal_id', goalId)
      .eq('category_id', categoryId)

    if (deleteError) {
      console.error('Error removing category from goal:', deleteError)
      setError(deleteError.message)
      return false
    }

    setGoalCategories(prev => prev.filter(gc => !(gc.goal_id === goalId && gc.category_id === categoryId)))
    return true
  }, [])

  const updateAutoTag = useCallback(async (
    goalId: string,
    categoryId: string,
    autoTag: boolean
  ): Promise<boolean> => {
    const { error: updateError } = await supabase
      .from('goal_categories')
      .update({ auto_tag: autoTag })
      .eq('goal_id', goalId)
      .eq('category_id', categoryId)

    if (updateError) {
      console.error('Error updating auto_tag:', updateError)
      setError(updateError.message)
      return false
    }

    setGoalCategories(prev =>
      prev.map(gc => gc.goal_id === goalId && gc.category_id === categoryId
        ? { ...gc, auto_tag: autoTag }
        : gc
      )
    )
    return true
  }, [])

  const setCategoriesForGoal = useCallback(async (
    goalId: string,
    entries: { categoryId: string; autoTag: boolean }[]
  ): Promise<boolean> => {
    if (!userId) return false

    // Delete existing mappings for this goal
    const { error: deleteError } = await supabase
      .from('goal_categories')
      .delete()
      .eq('goal_id', goalId)

    if (deleteError) {
      console.error('Error clearing goal categories:', deleteError)
      setError(deleteError.message)
      return false
    }

    // Insert new mappings
    if (entries.length > 0) {
      const inserts = entries.map(e => ({
        goal_id: goalId,
        category_id: e.categoryId,
        user_id: userId,
        auto_tag: e.autoTag,
      }))

      const { data, error: insertError } = await supabase
        .from('goal_categories')
        .insert(inserts)
        .select()

      if (insertError) {
        console.error('Error setting goal categories:', insertError)
        setError(insertError.message)
        return false
      }

      setGoalCategories(prev => [
        ...prev.filter(gc => gc.goal_id !== goalId),
        ...(data as GoalCategory[]),
      ])
    } else {
      setGoalCategories(prev => prev.filter(gc => gc.goal_id !== goalId))
    }

    return true
  }, [userId])

  const getCategoriesForGoal = useCallback((goalId: string): GoalCategory[] => {
    return goalCategories.filter(gc => gc.goal_id === goalId)
  }, [goalCategories])

  // Returns the goal_id for a category if it has auto_tag = true, otherwise null
  const autoTagMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const gc of goalCategories) {
      if (gc.auto_tag) {
        map.set(gc.category_id, gc.goal_id)
      }
    }
    return map
  }, [goalCategories])

  const getGoalForCategory = useCallback((categoryId: string): string | null => {
    return autoTagMap.get(categoryId) ?? null
  }, [autoTagMap])

  return {
    goalCategories,
    loading,
    error,
    addCategoryToGoal,
    removeCategoryFromGoal,
    updateAutoTag,
    setCategoriesForGoal,
    getCategoriesForGoal,
    getGoalForCategory,
    refetch: fetchGoalCategories,
  }
}
