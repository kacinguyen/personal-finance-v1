import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Target,
  Utensils,
  ShoppingBag,
  Car,
  Clapperboard,
  Receipt,
  Heart,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  LucideIcon,
  Home,
  ShoppingCart,
  Plane,
  Gift,
  Coffee,
  Gamepad2,
  Music,
  Book,
  Dumbbell,
  Pill,
  Scissors,
  CreditCard,
  ChevronDown,
  Sparkles,
  Shield,
  CircleDollarSign,
  Zap,
  Shirt,
  Loader2,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

type CategoryType = 'need' | 'want'

// Database budget type
type DBBudget = {
  id: string
  category: string
  monthly_limit: number
  budget_type: CategoryType
  flexibility: 'fixed' | 'variable'
  icon: string
  color: string
  is_active: boolean
}

// UI budget type
type CategoryBudget = {
  id: string
  name: string
  icon: LucideIcon
  budget: number
  lastMonthSpent: number
  color: string
  type: CategoryType
}

// Map icon names to components
const iconMap: Record<string, LucideIcon> = {
  Utensils,
  ShoppingBag,
  Car,
  Clapperboard,
  Receipt,
  Heart,
  Home,
  ShoppingCart,
  Plane,
  Gift,
  Coffee,
  Gamepad2,
  Music,
  Book,
  Dumbbell,
  Pill,
  Scissors,
  CreditCard,
  Sparkles,
  Shield,
  CircleDollarSign,
  Zap,
  Shirt,
}

const availableIcons: {
  icon: LucideIcon
  name: string
}[] = [
  { icon: Utensils, name: 'Utensils' },
  { icon: ShoppingBag, name: 'ShoppingBag' },
  { icon: Car, name: 'Car' },
  { icon: Clapperboard, name: 'Clapperboard' },
  { icon: Receipt, name: 'Receipt' },
  { icon: Heart, name: 'Heart' },
  { icon: Home, name: 'Home' },
  { icon: Plane, name: 'Plane' },
  { icon: Gift, name: 'Gift' },
  { icon: Coffee, name: 'Coffee' },
  { icon: Gamepad2, name: 'Gamepad2' },
  { icon: Music, name: 'Music' },
  { icon: Book, name: 'Book' },
  { icon: Dumbbell, name: 'Dumbbell' },
  { icon: Pill, name: 'Pill' },
]

const availableColors = [
  '#FF6B6B',
  '#A855F7',
  '#38BDF8',
  '#EC4899',
  '#F59E0B',
  '#10B981',
  '#6366F1',
  '#F97316',
  '#14B8A6',
  '#8B5CF6',
]

// Convert DB budget to UI format
function dbToUI(budget: DBBudget): CategoryBudget {
  return {
    id: budget.id,
    name: budget.category,
    icon: iconMap[budget.icon] || CircleDollarSign,
    budget: Number(budget.monthly_limit),
    lastMonthSpent: 0, // TODO: Calculate from transactions
    color: budget.color,
    type: budget.budget_type,
  }
}

// CategoryCard component - defined outside to prevent re-creation on parent re-renders
function CategoryCard({
  category,
  onBudgetChange,
}: {
  category: CategoryBudget
  onBudgetChange: (id: string, value: string) => void
}) {
  const Icon = category.icon
  return (
    <div
      className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm group hover:shadow-md transition-shadow"
      style={{
        boxShadow: '0 2px 8px rgba(31, 20, 16, 0.04)',
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          backgroundColor: `${category.color}15`,
        }}
      >
        <Icon
          className="w-6 h-6"
          style={{
            color: category.color,
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-[#1F1410] text-lg">
            {category.name}
          </h3>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              category.type === 'need'
                ? 'bg-[#10B981]/10 text-[#10B981]'
                : 'bg-[#A855F7]/10 text-[#A855F7]'
            }`}
          >
            {category.type === 'need' ? 'Need' : 'Want'}
          </span>
        </div>
        <p className="text-sm text-[#1F1410]/40">
          Last month: ${category.lastMonthSpent.toLocaleString()}
        </p>
      </div>
      <div className="flex flex-col items-end">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 font-medium">
            $
          </span>
          <input
            type="text"
            value={category.budget}
            onChange={(e) => onBudgetChange(category.id, e.target.value)}
            className="w-32 pl-7 pr-3 py-2 text-right font-bold text-[#1F1410] bg-[#1F1410]/[0.03] rounded-lg focus:bg-white focus:ring-2 focus:ring-[#6366F1]/20 focus:outline-none transition-all"
          />
        </div>
      </div>
    </div>
  )
}

export function BudgetView() {
  const [categories, setCategories] = useState<CategoryBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [expectedIncome, setExpectedIncome] = useState(0)
  const [currentMonth] = useState(new Date())

  // Add category dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0])
  const [selectedColor, setSelectedColor] = useState(availableColors[6])
  const [newBudget, setNewBudget] = useState('')
  const [selectedType, setSelectedType] = useState<CategoryType>('need')

  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fetch budgets from database
  const fetchBudgets = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('is_active', true)
      .order('category')

    if (error) {
      console.error('Error fetching budgets:', error)
    } else if (data) {
      setCategories(data.map(dbToUI))
    }
    setLoading(false)
  }, [])

  // Fetch expected income from paystubs
  const fetchExpectedIncome = useCallback(async () => {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('paystubs')
      .select('net_pay')
      .gte('pay_date', startOfMonth)
      .lte('pay_date', endOfMonth)

    if (error) {
      console.error('Error fetching paystubs:', error)
    } else if (data) {
      const totalIncome = data.reduce((sum, p) => sum + Number(p.net_pay), 0)
      setExpectedIncome(totalIncome)
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchBudgets()
    fetchExpectedIncome()
  }, [fetchBudgets, fetchExpectedIncome])

  // Separate categories by type
  const needsCategories = useMemo(
    () => categories.filter((c) => c.type === 'need'),
    [categories],
  )
  const wantsCategories = useMemo(
    () => categories.filter((c) => c.type === 'want'),
    [categories],
  )

  const totalBudget = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.budget, 0),
    [categories],
  )

  const needsBudget = useMemo(
    () => needsCategories.reduce((sum, cat) => sum + cat.budget, 0),
    [needsCategories],
  )

  const wantsBudget = useMemo(
    () => wantsCategories.reduce((sum, cat) => sum + cat.budget, 0),
    [wantsCategories],
  )

  const remainingToAllocate = expectedIncome - totalBudget
  const isOverBudget = remainingToAllocate < 0

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false)
        resetForm()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isDropdownOpen])

  const resetForm = () => {
    setNewCategoryName('')
    setSelectedIcon(availableIcons[0])
    setSelectedColor(availableColors[6])
    setNewBudget('')
    setSelectedType('need')
  }

  // Update budget in database (debounced)
  const updateBudgetInDB = useCallback(async (id: string, value: number) => {
    const { error } = await supabase
      .from('budgets')
      .update({ monthly_limit: value })
      .eq('id', id)

    if (error) {
      console.error('Error updating budget:', error)
    }
  }, [])

  // Debounce ref for budget updates
  const debounceRef = useRef<Record<string, NodeJS.Timeout>>({})

  const handleBudgetChange = (id: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0

    // Update local state immediately
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === id
          ? {
              ...cat,
              budget: numValue,
            }
          : cat,
      ),
    )

    // Debounce database update
    if (debounceRef.current[id]) {
      clearTimeout(debounceRef.current[id])
    }
    debounceRef.current[id] = setTimeout(() => {
      updateBudgetInDB(id, numValue)
    }, 500)
  }

  const handleCreateCategory = async () => {
    if (newCategoryName.trim()) {
      const { data, error } = await supabase
        .from('budgets')
        .insert({
          category: newCategoryName.trim(),
          monthly_limit: parseInt(newBudget) || 0,
          budget_type: selectedType,
          flexibility: 'variable',
          icon: selectedIcon.name,
          color: selectedColor,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating category:', error)
      } else if (data) {
        setCategories((prev) => [...prev, dbToUI(data)])
      }

      setIsDropdownOpen(false)
      resetForm()
    }
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{
            opacity: 0,
            y: -20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.5,
          }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              initial={{
                scale: 0,
              }}
              animate={{
                scale: 1,
              }}
              transition={{
                type: 'spring',
                stiffness: 200,
                damping: 15,
                delay: 0.2,
              }}
              className="w-12 h-12 rounded-xl bg-[#6366F1]/10 flex items-center justify-center"
            >
              <Target className="w-6 h-6 text-[#6366F1]" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">
              Budget Plan
            </h1>
          </div>
          <p className="text-[#1F1410]/60 text-lg">
            Allocate your monthly income to categories
          </p>
        </motion.div>

        {/* Month Selector */}
        <div className="flex items-center justify-between mb-6">
          <button className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#1F1410]/60" />
          </button>
          <span className="text-lg font-bold text-[#1F1410]">
            {formatMonth(currentMonth)}
          </span>
          <button className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors">
            <ChevronRight className="w-5 h-5 text-[#1F1410]/60" />
          </button>
        </div>

        {/* Summary Card */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
            duration: 0.4,
          }}
          className="bg-white rounded-2xl p-6 shadow-sm mb-8"
          style={{
            boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#1F1410]/50 mb-1">
                Total Budget
              </span>
              <span className="text-3xl font-bold text-[#1F1410]">
                ${totalBudget.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#1F1410]/50 mb-1">
                Expected Income
              </span>
              <span className="text-3xl font-bold text-[#1F1410]">
                ${expectedIncome.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Left to Allocate with Needs/Wants breakdown */}
          <div className="border-t border-[#1F1410]/5 pt-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-[#1F1410]/50">
                {isOverBudget ? 'Over Budget' : 'Left to Allocate'}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-2xl font-bold ${isOverBudget ? 'text-[#FF6B6B]' : 'text-[#10B981]'}`}
                >
                  {isOverBudget ? '-' : ''}$
                  {Math.abs(remainingToAllocate).toLocaleString()}
                </span>
                {isOverBudget ? (
                  <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                )}
              </div>
            </div>

            {/* Needs vs Wants Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              {/* Needs */}
              <div className="bg-[#10B981]/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-[#10B981]" />
                  <span className="text-sm font-semibold text-[#10B981]">
                    Needs
                  </span>
                </div>
                <p className="text-2xl font-bold text-[#1F1410]">
                  ${needsBudget.toLocaleString()}
                </p>
                <p className="text-xs text-[#1F1410]/40 mt-1">
                  {expectedIncome > 0 ? Math.round((needsBudget / expectedIncome) * 100) : 0}% of income
                </p>
              </div>

              {/* Wants */}
              <div className="bg-[#A855F7]/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#A855F7]" />
                  <span className="text-sm font-semibold text-[#A855F7]">
                    Wants
                  </span>
                </div>
                <p className="text-2xl font-bold text-[#1F1410]">
                  ${wantsBudget.toLocaleString()}
                </p>
                <p className="text-xs text-[#1F1410]/40 mt-1">
                  {expectedIncome > 0 ? Math.round((wantsBudget / expectedIncome) * 100) : 0}% of income
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-3 bg-[#1F1410]/5 rounded-full overflow-hidden flex">
                <motion.div
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: `${expectedIncome > 0 ? Math.min((needsBudget / expectedIncome) * 100, 100) : 0}%`,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: 'easeOut',
                  }}
                  className="h-full bg-[#10B981]"
                />
                <motion.div
                  initial={{
                    width: 0,
                  }}
                  animate={{
                    width: `${expectedIncome > 0 ? Math.min((wantsBudget / expectedIncome) * 100, 100) : 0}%`,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: 'easeOut',
                    delay: 0.2,
                  }}
                  className="h-full bg-[#A855F7]"
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-[#1F1410]/40">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                    <span>Needs</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#A855F7]" />
                    <span>Wants</span>
                  </div>
                </div>
                <span>
                  {expectedIncome > 0 ? Math.round((totalBudget / expectedIncome) * 100) : 0}% allocated
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Categories List */}
        <div className="space-y-6">
          {/* Header with Add Button Dropdown */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1F1410]">Categories</h2>

            {/* Add Category Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                initial={{
                  opacity: 0,
                }}
                animate={{
                  opacity: 1,
                }}
                transition={{
                  delay: 0.3,
                }}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  isDropdownOpen
                    ? 'text-[#6366F1] bg-[#6366F1]/10'
                    : 'text-[#1F1410]/60 hover:text-[#6366F1] hover:bg-[#6366F1]/5'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
                <motion.div
                  animate={{
                    rotate: isDropdownOpen ? 180 : 0,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{
                      opacity: 0,
                      y: -8,
                      scale: 0.96,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -8,
                      scale: 0.96,
                    }}
                    transition={{
                      duration: 0.15,
                      ease: 'easeOut',
                    }}
                    className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl overflow-hidden w-72"
                    style={{
                      boxShadow: '0 4px 24px rgba(31, 20, 16, 0.12)',
                    }}
                  >
                    <div className="p-4">
                      <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mb-3">
                        New Category
                      </p>

                      {/* Category Name */}
                      <input
                        ref={inputRef}
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateCategory()
                          if (e.key === 'Escape') {
                            setIsDropdownOpen(false)
                            resetForm()
                          }
                        }}
                        placeholder="Category name"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all placeholder:text-[#1F1410]/30"
                      />

                      {/* Type Selection */}
                      <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                        Type
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedType('need')}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedType === 'need'
                              ? 'bg-[#10B981]/10 text-[#10B981] ring-2 ring-[#10B981]/20'
                              : 'bg-[#1F1410]/[0.03] text-[#1F1410]/60 hover:bg-[#1F1410]/[0.06]'
                          }`}
                        >
                          <Shield className="w-4 h-4" />
                          Need
                        </button>
                        <button
                          onClick={() => setSelectedType('want')}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            selectedType === 'want'
                              ? 'bg-[#A855F7]/10 text-[#A855F7] ring-2 ring-[#A855F7]/20'
                              : 'bg-[#1F1410]/[0.03] text-[#1F1410]/60 hover:bg-[#1F1410]/[0.06]'
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                          Want
                        </button>
                      </div>

                      {/* Budget Amount */}
                      <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                        Monthly Budget
                      </p>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 text-sm">
                          $
                        </span>
                        <input
                          type="text"
                          value={newBudget}
                          onChange={(e) =>
                            setNewBudget(e.target.value.replace(/[^0-9]/g, ''))
                          }
                          placeholder="0"
                          className="w-full pl-7 pr-3 py-2 text-sm rounded-lg border border-[#1F1410]/10 focus:border-[#6366F1]/30 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/10 transition-all placeholder:text-[#1F1410]/30"
                        />
                      </div>

                      {/* Icon Selection */}
                      <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                        Icon
                      </p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {availableIcons.map(({ icon: Icon, name }) => (
                          <button
                            key={name}
                            onClick={() =>
                              setSelectedIcon({
                                icon: Icon,
                                name,
                              })
                            }
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                            style={{
                              backgroundColor:
                                selectedIcon.name === name
                                  ? `${selectedColor}20`
                                  : 'rgba(31, 20, 16, 0.03)',
                              color:
                                selectedIcon.name === name
                                  ? selectedColor
                                  : 'rgba(31, 20, 16, 0.4)',
                            }}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>

                      {/* Color Selection */}
                      <p className="text-xs font-semibold text-[#1F1410]/40 uppercase tracking-wide mt-4 mb-2">
                        Color
                      </p>
                      <div className="flex gap-1.5 flex-wrap">
                        {availableColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className="w-7 h-7 rounded-full transition-transform"
                            style={{
                              backgroundColor: color,
                              transform:
                                selectedColor === color
                                  ? 'scale(1.15)'
                                  : 'scale(1)',
                              boxShadow:
                                selectedColor === color
                                  ? `0 0 0 2px white, 0 0 0 4px ${color}`
                                  : 'none',
                            }}
                          />
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false)
                            resetForm()
                          }}
                          className="flex-1 px-3 py-2 text-sm font-medium text-[#1F1410]/60 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCreateCategory}
                          disabled={!newCategoryName.trim()}
                          className="flex-1 px-3 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-40"
                          style={{
                            backgroundColor: selectedColor,
                          }}
                        >
                          Create
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Needs Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[#10B981]" />
              <h3 className="text-sm font-semibold text-[#10B981]">Needs</h3>
              <span className="text-xs text-[#1F1410]/40">
                ({needsCategories.length} categories)
              </span>
            </div>
            <div className="space-y-3">
              {needsCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onBudgetChange={handleBudgetChange}
                />
              ))}
              {needsCategories.length === 0 && (
                <p className="text-sm text-[#1F1410]/40 py-4 text-center">
                  No needs categories yet
                </p>
              )}
            </div>
          </div>

          {/* Wants Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#A855F7]" />
              <h3 className="text-sm font-semibold text-[#A855F7]">Wants</h3>
              <span className="text-xs text-[#1F1410]/40">
                ({wantsCategories.length} categories)
              </span>
            </div>
            <div className="space-y-3">
              {wantsCategories.map((category) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  onBudgetChange={handleBudgetChange}
                />
              ))}
              {wantsCategories.length === 0 && (
                <p className="text-sm text-[#1F1410]/40 py-4 text-center">
                  No wants categories yet
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
