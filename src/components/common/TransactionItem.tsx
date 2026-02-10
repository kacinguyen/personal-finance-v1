import { motion } from 'framer-motion'
import { CreditCard, LucideIcon } from 'lucide-react'

type TransactionType = 'income' | 'expense' | 'transfer'

const TYPE_COLORS: Record<TransactionType, { bg: string; text: string }> = {
  income: { bg: '#10B98126', text: '#10B981' },
  expense: { bg: '#6B728026', text: '#6B7280' },
  transfer: { bg: '#8B5CF626', text: '#8B5CF6' },
}

type TransactionItemProps = {
  id: string
  icon: LucideIcon
  merchant: string
  category: string
  date: string
  amount: number
  color: string
  source: string
  type: TransactionType
  needsReview?: boolean
  index: number
  isSelected?: boolean
  onClick: () => void
}

export function TransactionItem({
  icon: Icon,
  merchant,
  category,
  date,
  amount,
  color,
  source,
  type,
  needsReview,
  index,
  isSelected,
  onClick,
}: TransactionItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
      onClick={onClick}
      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors ${
        isSelected ? 'bg-[#8B5CF6]/5' : 'hover:bg-[#1F1410]/[0.02]'
      }`}
    >
      {needsReview ? (
        <div className="w-2 h-2 rounded-full bg-[#3B82F6] flex-shrink-0" />
      ) : (
        <div className="w-2 flex-shrink-0" />
      )}
      <motion.div
        className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        <Icon className="w-5 h-5 text-white" />
      </motion.div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#1F1410] truncate">{merchant}</p>
        <div className="flex items-center gap-1.5 text-sm text-[#1F1410]/50">
          <span style={{ color }}>{category}</span>
          <span>•</span>
          <span>{date}</span>
          <span>•</span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-medium uppercase"
            style={{ backgroundColor: TYPE_COLORS[type].bg, color: TYPE_COLORS[type].text }}
          >
            {type}
          </span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <CreditCard className="w-3 h-3" />
            <span className="text-xs">{source}</span>
          </div>
        </div>
      </div>

      <span
        className="font-bold text-lg"
        style={{ color: type === 'income' ? '#10B981' : type === 'transfer' ? '#8B5CF6' : '#1F1410' }}
      >
        {type === 'income' ? '+' : '-'}${amount.toFixed(2)}
      </span>
    </motion.div>
  )
}
