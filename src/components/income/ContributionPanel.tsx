import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { formatMonth } from '../../lib/dateUtils'

export type ContributionLineItem = {
  label: string
  value: number
  /** If true, renders with green highlight style (e.g. "+ Employer Match") */
  highlight?: boolean
}

type Props = {
  title: string
  selectedMonth: Date
  icon: LucideIcon
  /** Tailwind bg class for the icon container, e.g. "bg-[#6366F1]/10" */
  iconBgClass: string
  /** Tailwind text class for the icon, e.g. "text-[#6366F1]" */
  iconTextClass: string
  /** Color used for the total/main amount, e.g. "#6366F1" */
  accentColor: string
  /** Optional line items shown above the total (used for 401k breakdown) */
  lineItems?: ContributionLineItem[]
  /** The main amount to display. For simple panels this is "This Month", for 401k it is the "Total" */
  amount: number
  /** Label for the main amount row. Defaults to "This Month" if no lineItems, "Total" if lineItems present */
  amountLabel?: string
  /** YTD total shown below the main amount */
  ytdTotal?: number
  /** Animation delay for the motion wrapper */
  animationDelay?: number
}

export function ContributionPanel({
  title,
  selectedMonth,
  icon: Icon,
  iconBgClass,
  iconTextClass,
  accentColor,
  lineItems,
  amount,
  amountLabel,
  ytdTotal,
  animationDelay = 0.4,
}: Props) {
  const hasLineItems = lineItems && lineItems.length > 0
  const label = amountLabel || (hasLineItems ? 'Total' : 'This Month')

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: animationDelay, duration: 0.4 }}
      className="bg-white rounded-2xl p-5 shadow-sm"
      style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl ${iconBgClass} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${iconTextClass}`} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[#1F1410]">{title}</h3>
          <p className="text-xs text-[#1F1410]/40">{formatMonth(selectedMonth)}</p>
        </div>
      </div>

      <div className={hasLineItems ? 'space-y-3' : 'space-y-2'}>
        {hasLineItems && lineItems.map((item) => (
          item.value > 0 && (
            <div key={item.label} className="flex justify-between items-center">
              <span className={`text-sm ${item.highlight ? 'text-[#10B981]' : 'text-[#1F1410]/70'}`}>
                {item.highlight ? '+ ' : ''}{item.label}
              </span>
              <span className={`text-sm font-semibold ${item.highlight ? 'text-[#10B981]' : 'text-[#1F1410]'}`}>
                ${item.value.toLocaleString()}
              </span>
            </div>
          )
        ))}

        {hasLineItems ? (
          <div className="pt-2 border-t border-[#1F1410]/5">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-[#1F1410]">{label}</span>
              <span className="text-lg font-bold" style={{ color: accentColor }}>
                ${amount.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-sm text-[#1F1410]/70">{label}</span>
            <span className="text-lg font-bold" style={{ color: accentColor }}>
              ${amount.toLocaleString()}
            </span>
          </div>
        )}

        {ytdTotal != null && ytdTotal > 0 && (
          <div className={`flex justify-between items-center ${hasLineItems ? 'pt-1' : ''}`}>
            <span className="text-xs text-[#1F1410]/40">YTD Total</span>
            <span className="text-xs font-medium text-[#1F1410]/60">${ytdTotal.toLocaleString()}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}
