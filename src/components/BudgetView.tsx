import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Target,
  Utensils,
  ShoppingBag,
  Car,
  Clapperboard,
  Plus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  LucideIcon,
  Home,
  ShoppingCart,
  Plane,
  Dumbbell,
  Scissors,
  CreditCard,
} from 'lucide-react'

type CategoryBudget = {
  id: string
  name: string
  icon: LucideIcon
  budget: number
  lastMonthSpent: number
  color: string
}

const initialCategories: CategoryBudget[] = [
  { id: '1', name: 'Rent', icon: Home, budget: 2000, lastMonthSpent: 0, color: '#6366F1' },
  { id: '2', name: 'Groceries', icon: ShoppingCart, budget: 600, lastMonthSpent: 0, color: '#10B981' },
  { id: '3', name: 'Dining Out', icon: Utensils, budget: 400, lastMonthSpent: 0, color: '#FF6B6B' },
  { id: '4', name: 'Transportation', icon: Car, budget: 200, lastMonthSpent: 0, color: '#38BDF8' },
  { id: '5', name: 'Travel', icon: Plane, budget: 500, lastMonthSpent: 0, color: '#F59E0B' },
  { id: '6', name: 'Shopping - General', icon: ShoppingBag, budget: 300, lastMonthSpent: 0, color: '#A855F7' },
  { id: '7', name: 'Fitness', icon: Dumbbell, budget: 150, lastMonthSpent: 0, color: '#EF4444' },
  { id: '8', name: 'Self Care', icon: Scissors, budget: 100, lastMonthSpent: 0, color: '#EC4899' },
  { id: '9', name: 'Entertainment', icon: Clapperboard, budget: 150, lastMonthSpent: 0, color: '#8B5CF6' },
  { id: '10', name: 'Subscriptions', icon: CreditCard, budget: 100, lastMonthSpent: 0, color: '#14B8A6' },
]

export function BudgetView() {
  const [categories, setCategories] =
    useState<CategoryBudget[]>(initialCategories)
  const [expectedIncome] = useState(3500)
  const [currentMonth] = useState(new Date())

  const totalBudget = useMemo(
    () => categories.reduce((sum, cat) => sum + cat.budget, 0),
    [categories],
  )

  const remainingToAllocate = expectedIncome - totalBudget
  const isOverBudget = remainingToAllocate < 0

  const handleBudgetChange = (id: string, value: string) => {
    const numValue = parseInt(value.replace(/[^0-9]/g, '')) || 0
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
  }

  const formatMonth = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Budget */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#1F1410]/50 mb-1">
                Total Budget
              </span>
              <span className="text-3xl font-bold text-[#1F1410]">
                ${totalBudget.toLocaleString()}
              </span>
            </div>

            {/* Expected Income */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#1F1410]/50 mb-1">
                Expected Income
              </span>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-[#1F1410]">
                  ${expectedIncome.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Remaining */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[#1F1410]/50 mb-1">
                {isOverBudget ? 'Over Budget' : 'Left to Allocate'}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-3xl font-bold ${isOverBudget ? 'text-[#FF6B6B]' : 'text-[#10B981]'}`}
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
          </div>

          {/* Progress Bar */}
          <div className="mt-6">
            <div className="h-3 bg-[#1F1410]/5 rounded-full overflow-hidden flex">
              <motion.div
                initial={{
                  width: 0,
                }}
                animate={{
                  width: `${Math.min((totalBudget / expectedIncome) * 100, 100)}%`,
                }}
                transition={{
                  duration: 1,
                  ease: 'easeOut',
                }}
                className={`h-full ${isOverBudget ? 'bg-[#FF6B6B]' : 'bg-[#6366F1]'}`}
              />
            </div>
          </div>
        </motion.div>

        {/* Categories List */}
        <div className="space-y-4">
          {/* Header with Add Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#1F1410]">Categories</h2>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#1F1410]/60 hover:text-[#6366F1] hover:bg-[#6366F1]/5 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </motion.button>
          </div>

          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <motion.div
                key={category.id}
                initial={{
                  opacity: 0,
                  x: -20,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                }}
                transition={{
                  delay: 0.3 + index * 0.05,
                  duration: 0.3,
                }}
                className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm group hover:shadow-md transition-shadow"
                style={{
                  boxShadow: '0 2px 8px rgba(31, 20, 16, 0.04)',
                }}
              >
                {/* Icon */}
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

                {/* Name & Last Month */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1F1410] text-lg">
                    {category.name}
                  </h3>
                  <p className="text-sm text-[#1F1410]/40">
                    Last month: ${category.lastMonthSpent.toLocaleString()}
                  </p>
                </div>

                {/* Budget Input */}
                <div className="flex flex-col items-end">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 font-medium">
                      $
                    </span>
                    <input
                      type="text"
                      value={category.budget}
                      onChange={(e) =>
                        handleBudgetChange(category.id, e.target.value)
                      }
                      className="w-32 pl-7 pr-3 py-2 text-right font-bold text-[#1F1410] bg-[#1F1410]/[0.03] rounded-lg focus:bg-white focus:ring-2 focus:ring-[#6366F1]/20 focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            )
          })}

        </div>
      </div>
    </div>
  )
}
