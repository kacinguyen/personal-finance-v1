import { motion } from 'framer-motion'
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
  index,
  onClick,
}: TransactionItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-[#1F1410]/[0.02] transition-colors"
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
          <span style={{ color }}>{category}</span>
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
