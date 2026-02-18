import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useUser } from './useUser'

export type MatchType = 'exact' | 'contains' | 'starts_with'

export type MerchantRule = {
  id: string
  user_id: string
  pattern: string
  match_type: MatchType
  category_id: string
  priority: number
  is_active: boolean
  created_at: string
  updated_at: string
}

type UseMerchantRulesReturn = {
  rules: MerchantRule[]
  loading: boolean
  error: string | null
  createRule: (pattern: string, matchType: MatchType, categoryId: string) => Promise<MerchantRule | null>
  deleteRule: (id: string) => Promise<boolean>
  findRuleForMerchant: (merchant: string) => MerchantRule | undefined
  refetch: () => Promise<void>
}

export function useMerchantRules(): UseMerchantRulesReturn {
  const { userId } = useUser()
  const [rules, setRules] = useState<MerchantRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRules = useCallback(async () => {
    if (!userId) {
      setRules([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('merchant_category_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })

    if (fetchError) {
      console.error('Error fetching merchant rules:', fetchError)
      setError(fetchError.message)
      setRules([])
    } else {
      setRules(data as MerchantRule[])
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const createRule = useCallback(async (
    pattern: string,
    matchType: MatchType,
    categoryId: string,
  ): Promise<MerchantRule | null> => {
    if (!userId) {
      setError('User not authenticated')
      return null
    }

    const normalizedPattern = pattern.toLowerCase().trim()

    // Check for duplicate pattern + match_type
    const existing = rules.find(
      r => r.pattern === normalizedPattern && r.match_type === matchType
    )
    if (existing) {
      // Update category if different
      if (existing.category_id !== categoryId) {
        const { data, error: updateError } = await supabase
          .from('merchant_category_rules')
          .update({ category_id: categoryId })
          .eq('id', existing.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating merchant rule:', updateError)
          setError(updateError.message)
          return null
        }

        const updated = data as MerchantRule
        setRules(prev => prev.map(r => r.id === existing.id ? updated : r))
        return updated
      }
      return existing
    }

    const { data, error: insertError } = await supabase
      .from('merchant_category_rules')
      .insert({
        user_id: userId,
        pattern: normalizedPattern,
        match_type: matchType,
        category_id: categoryId,
        priority: 0,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating merchant rule:', insertError)
      setError(insertError.message)
      return null
    }

    const newRule = data as MerchantRule
    setRules(prev => [...prev, newRule])
    return newRule
  }, [userId, rules])

  const deleteRule = useCallback(async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from('merchant_category_rules')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting merchant rule:', deleteError)
      setError(deleteError.message)
      return false
    }

    setRules(prev => prev.filter(r => r.id !== id))
    return true
  }, [])

  const findRuleForMerchant = useCallback((merchant: string): MerchantRule | undefined => {
    const lowerMerchant = merchant.toLowerCase().trim()
    return rules.find(rule => {
      switch (rule.match_type) {
        case 'exact':
          return lowerMerchant === rule.pattern
        case 'contains':
          return lowerMerchant.includes(rule.pattern)
        case 'starts_with':
          return lowerMerchant.startsWith(rule.pattern)
        default:
          return false
      }
    })
  }, [rules])

  return {
    rules,
    loading,
    error,
    createRule,
    deleteRule,
    findRuleForMerchant,
    refetch: fetchRules,
  }
}
