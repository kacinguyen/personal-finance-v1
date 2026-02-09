import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { Category, CategoryInsert, CategoryUpdate, CategoryType } from '../types/category'
import { DEFAULT_CATEGORIES, flattenCategories } from '../types/category'
import { useUser } from './useUser'

type UseCategoriesReturn = {
  categories: Category[]
  loading: boolean
  error: string | null
  // CRUD operations
  createCategory: (category: Omit<CategoryInsert, 'user_id'>) => Promise<Category | null>
  updateCategory: (update: CategoryUpdate) => Promise<Category | null>
  deleteCategory: (id: string) => Promise<boolean>
  seedDefaultCategories: () => Promise<Category[]>
  // Helpers
  findCategoryByName: (name: string) => Category | undefined
  findCategoryById: (id: string) => Category | undefined
  getCategoriesByType: (type: CategoryType) => Category[]
  // Filtered lists
  needCategories: Category[]
  wantCategories: Category[]
  incomeCategories: Category[]
  transferCategories: Category[]
  savingsFundedCategories: Category[]
  budgetableIncomeCategories: Category[]
  windfallIncomeCategories: Category[]
  // Refetch
  refetch: () => Promise<void>
}

export function useCategories(): UseCategoriesReturn {
  const { userId } = useUser()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCategories = useCallback(async () => {
    if (!userId) {
      setCategories([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (fetchError) {
      console.error('Error fetching categories:', fetchError)
      setError(fetchError.message)
      setCategories([])
    } else {
      setCategories(data as Category[])
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const createCategory = useCallback(async (
    categoryData: Omit<CategoryInsert, 'user_id'>
  ): Promise<Category | null> => {
    if (!userId) {
      setError('User not authenticated')
      return null
    }

    const normalizedName = categoryData.name.toLowerCase()

    // Check for duplicate (case-insensitive)
    const existing = categories.find(c => c.normalized_name === normalizedName)
    if (existing) {
      return existing
    }

    const { data, error: insertError } = await supabase
      .from('categories')
      .insert({
        ...categoryData,
        user_id: userId,
        normalized_name: normalizedName,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating category:', insertError)
      setError(insertError.message)
      return null
    }

    const newCategory = data as Category
    setCategories(prev => [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name)))
    return newCategory
  }, [userId, categories])

  const updateCategory = useCallback(async (
    update: CategoryUpdate
  ): Promise<Category | null> => {
    const { id, ...updateData } = update

    // If name is being updated, also update normalized_name
    const finalUpdate = updateData.name
      ? { ...updateData, normalized_name: updateData.name.toLowerCase() }
      : updateData

    const { data, error: updateError } = await supabase
      .from('categories')
      .update(finalUpdate)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating category:', updateError)
      setError(updateError.message)
      return null
    }

    const updatedCategory = data as Category
    setCategories(prev =>
      prev.map(c => c.id === id ? updatedCategory : c)
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    return updatedCategory
  }, [])

  const deleteCategory = useCallback(async (id: string): Promise<boolean> => {
    // Check if it's a system category
    const category = categories.find(c => c.id === id)
    if (category?.is_system) {
      setError('Cannot delete system category')
      return false
    }

    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting category:', deleteError)
      setError(deleteError.message)
      return false
    }

    setCategories(prev => prev.filter(c => c.id !== id))
    return true
  }, [categories])

  // Seed default categories for users who don't have any
  const seedDefaultCategories = useCallback(async (): Promise<Category[]> => {
    if (!userId) {
      setError('User not authenticated')
      return []
    }

    // Flatten the hierarchical categories
    const flatCategories = flattenCategories(DEFAULT_CATEGORIES)

    // First, insert parent categories (those without _parentName)
    const parents = flatCategories.filter(c => !c._parentName)
    const parentInserts = parents.map(({ _parentName, ...cat }) => ({
      ...cat,
      user_id: userId,
      normalized_name: cat.name.toLowerCase(),
    }))

    const { data: parentData, error: parentError } = await supabase
      .from('categories')
      .insert(parentInserts)
      .select()

    if (parentError) {
      console.error('Error seeding parent categories:', parentError)
      setError(parentError.message)
      return []
    }

    const createdParents = parentData as Category[]

    // Create a map of parent names to their IDs
    const parentMap = new Map<string, string>()
    createdParents.forEach(p => parentMap.set(p.name, p.id))

    // Now insert child categories with parent_id
    const children = flatCategories.filter(c => c._parentName)
    if (children.length > 0) {
      const childInserts = children.map(({ _parentName, ...cat }) => ({
        ...cat,
        user_id: userId,
        normalized_name: cat.name.toLowerCase(),
        parent_id: _parentName ? parentMap.get(_parentName) : null,
      }))

      const { data: childData, error: childError } = await supabase
        .from('categories')
        .insert(childInserts)
        .select()

      if (childError) {
        console.error('Error seeding child categories:', childError)
        setError(childError.message)
        return createdParents
      }

      const allCategories = [...createdParents, ...(childData as Category[])]
      setCategories(allCategories.sort((a, b) => a.name.localeCompare(b.name)))
      return allCategories
    }

    setCategories(createdParents.sort((a, b) => a.name.localeCompare(b.name)))
    return createdParents
  }, [userId])

  const findCategoryByName = useCallback((name: string): Category | undefined => {
    const normalizedName = name.toLowerCase()
    return categories.find(c => c.normalized_name === normalizedName)
  }, [categories])

  const findCategoryById = useCallback((id: string): Category | undefined => {
    return categories.find(c => c.id === id)
  }, [categories])

  const getCategoriesByType = useCallback((type: CategoryType): Category[] => {
    return categories.filter(c => c.category_type === type)
  }, [categories])

  const needCategories = useMemo(
    () => categories.filter(c => c.category_type === 'need'),
    [categories]
  )

  const wantCategories = useMemo(
    () => categories.filter(c => c.category_type === 'want'),
    [categories]
  )

  const incomeCategories = useMemo(
    () => categories.filter(c => c.category_type === 'income'),
    [categories]
  )

  const transferCategories = useMemo(
    () => categories.filter(c => c.category_type === 'transfer'),
    [categories]
  )

  const savingsFundedCategories = useMemo(
    () => categories.filter(c => c.category_type === 'savings_funded'),
    [categories]
  )

  const budgetableIncomeCategories = useMemo(
    () => categories.filter(c => c.category_type === 'income' && c.is_budgetable),
    [categories]
  )

  const windfallIncomeCategories = useMemo(
    () => categories.filter(c => c.category_type === 'income' && !c.is_budgetable),
    [categories]
  )

  return {
    categories,
    loading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
    seedDefaultCategories,
    findCategoryByName,
    findCategoryById,
    getCategoriesByType,
    needCategories,
    wantCategories,
    incomeCategories,
    transferCategories,
    savingsFundedCategories,
    budgetableIncomeCategories,
    windfallIncomeCategories,
    refetch: fetchCategories,
  }
}
