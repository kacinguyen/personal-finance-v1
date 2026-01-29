import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'

type CategoryCardProps = {
  icon: LucideIcon
  name: string
  total: number
  budget: number
  color: string
  index: number
}

export function CategoryCard({
  icon: Icon,
  name,
  total,
  budget,
  color,
  index,
}: CategoryCardProps) {
  const [displayTotal, setDisplayTotal] = useState(0)
  const percentage = Math.min((total / budget) * 100, 100)

  useEffect(() => {
    const duration = 1000
    const steps = 60
    const increment = total / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= total) {
        setDisplayTotal(total)
        clearInterval(timer)
      } else {
        setDisplayTotal(Math.floor(current))
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [total])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, boxShadow: `0 8px 30px ${color}25` }}
      className="bg-white rounded-2xl p-6 shadow-sm cursor-pointer"
      style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </motion.div>
        <span className="text-xs font-medium text-[#1F1410]/50 uppercase tracking-wide">
          {name}
        </span>
      </div>

      <div className="mb-3">
        <span className="text-3xl font-bold text-[#1F1410]">
          ${displayTotal.toLocaleString()}
        </span>
        <span className="text-sm text-[#1F1410]/40 ml-1">
          / ${budget.toLocaleString()}
        </span>
      </div>

      <div className="h-2 bg-[#1F1410]/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </motion.div>
  )
}
