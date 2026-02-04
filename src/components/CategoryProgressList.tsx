import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

type CategoryWithBudget = {
  id: string
  icon: LucideIcon
  name: string
  total: number
  budget: number
  color: string
}

type CategoryProgressListProps = {
  categories: CategoryWithBudget[]
}

export function CategoryProgressList({ categories }: CategoryProgressListProps) {
  // Filter to only show categories with spending or a budget
  const activeCategories = categories.filter(cat => cat.total > 0 || cat.budget > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-white rounded-2xl p-6 shadow-sm mb-10"
      style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
    >
      <h2 className="text-lg font-bold text-[#1F1410] mb-5">Category Budgets</h2>

      {activeCategories.length === 0 ? (
        <p className="text-sm text-[#1F1410]/40 text-center py-4">
          No spending recorded yet
        </p>
      ) : (
        <div className="space-y-5">
          {activeCategories.map((category, index) => {
            const IconComponent = category.icon
            const percentage = category.budget > 0
              ? (category.total / category.budget) * 100
              : 0
            const isOverBudget = category.budget > 0 && category.total > category.budget
            const remaining = category.budget - category.total
            const displayColor = isOverBudget ? '#FF6B6B' : category.color

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + index * 0.05, duration: 0.3 }}
                className="group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  {/* Left section: Icon + Category info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${category.color}15` }}
                    >
                      <IconComponent className="w-4.5 h-4.5" style={{ color: category.color }} />
                    </motion.div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#1F1410] truncate group-hover:text-[#1F1410]/80 transition-colors">
                        {category.name}
                      </p>
                      <p className="text-xs text-[#1F1410]/40">
                        {category.budget > 0 ? (
                          isOverBudget ? (
                            <span className="text-[#FF6B6B]">
                              ${Math.abs(remaining).toLocaleString()} over budget
                            </span>
                          ) : (
                            <span>${remaining.toLocaleString()} remaining</span>
                          )
                        ) : (
                          <span>No budget set</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right section: Amount + Percentage */}
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="flex items-baseline gap-2 justify-end">
                      <span className="text-sm font-bold text-[#1F1410]">
                        ${category.total.toLocaleString()}
                      </span>
                      {category.budget > 0 && (
                        <span
                          className="text-xs font-medium"
                          style={{ color: displayColor }}
                        >
                          {Math.round(percentage)}%
                        </span>
                      )}
                    </div>
                    {category.budget > 0 && (
                      <p className="text-xs text-[#1F1410]/40">
                        of ${category.budget.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-[#1F1410]/5 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(percentage, 100)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 + index * 0.05, ease: 'easeOut' }}
                    className="h-full rounded-full relative"
                    style={{ backgroundColor: displayColor }}
                  >
                    {/* Shine effect */}
                    <motion.div
                      initial={{ x: '-100%' }}
                      animate={{ x: '200%' }}
                      transition={{
                        duration: 1.5,
                        delay: 0.8 + index * 0.05,
                        ease: 'easeInOut',
                      }}
                      className="absolute inset-0 w-1/2"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                      }}
                    />
                  </motion.div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
