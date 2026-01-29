import React from 'react'
import { motion } from 'framer-motion'
import { CategoryDropdown, Category } from './CategoryDropdown'
import { CreditCard, LucideIcon } from 'lucide-react'

type TransactionItemProps = {
  id: string
  icon: LucideIcon
  merchant: string
  category: string
  date: string
  amount: number
  color: string
  source: string
  index: number
  categories: Category[]
  onCategoryChange: (transactionId: string, category: Category) => void
  onCreateCategory: (category: Category) => void
}

export function TransactionItem({
  id,
  icon: Icon,
  merchant,
  category,
  date,
  amount,
  color,
  source,
  index,
  categories,
  onCategoryChange,
  onCreateCategory,
}: TransactionItemProps) {
  const handleSelect = (selectedCategory: Category) => {
    onCategoryChange(id, selectedCategory)
  }

  const handleCreateNew = (newCategory: Category) => {
    onCreateCategory(newCategory)
    onCategoryChange(id, newCategory)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
      className="flex items-center gap-4 p-4 rounded-xl"
    >
      <motion.div
        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        <Icon className="w-5 h-5 text-white" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1F1410] truncate">{merchant}</p>
        <div className="flex items-center gap-1.5 text-sm text-[#1F1410]/50">
          <CategoryDropdown
            currentCategory={category}
            currentColor={color}
            categories={categories}
            onSelect={handleSelect}
            onCreateNew={handleCreateNew}
          />
          <span>•</span>
          <span>{date}</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <CreditCard className="w-3 h-3" />
            <span className="text-xs">{source}</span>
          </div>
        </div>
      </div>

      <span className="font-bold text-[#1F1410] text-lg">-${amount.toFixed(2)}</span>
    </motion.div>
  )
}
