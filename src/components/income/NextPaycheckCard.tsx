import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Upload, Clock, CheckCircle2 } from 'lucide-react'
import type { PaystubRecord } from '../views/IncomeView'

interface NextPaycheckCardProps {
  paystubs: PaystubRecord[]
  onUploadClick: () => void
  loading: boolean
}

function getMedianGap(gaps: number[]): number {
  const sorted = [...gaps].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

export function NextPaycheckCard({ paystubs, onUploadClick, loading }: NextPaycheckCardProps) {
  const { nextPayDate, projectedAmount, daysUntil, isPayday } = useMemo(() => {
    if (paystubs.length < 1) {
      return { nextPayDate: null, projectedAmount: 0, daysUntil: 0, isPayday: false }
    }

    // Sort by pay_date descending
    const sorted = [...paystubs].sort(
      (a, b) => new Date(b.pay_date + 'T00:00:00').getTime() - new Date(a.pay_date + 'T00:00:00').getTime()
    )

    // Detect pay interval from gaps between consecutive dates
    let payInterval = 14 // default biweekly
    if (sorted.length >= 2) {
      const gaps: number[] = []
      for (let i = 0; i < sorted.length - 1 && i < 6; i++) {
        const current = new Date(sorted[i].pay_date + 'T00:00:00').getTime()
        const next = new Date(sorted[i + 1].pay_date + 'T00:00:00').getTime()
        const diffDays = Math.round((current - next) / (1000 * 60 * 60 * 24))
        if (diffDays > 0 && diffDays < 45) {
          gaps.push(diffDays)
        }
      }
      if (gaps.length > 0) {
        payInterval = getMedianGap(gaps)
      }
    }

    // Calculate next pay date from most recent
    const mostRecent = new Date(sorted[0].pay_date + 'T00:00:00')
    let next = new Date(mostRecent)
    next.setDate(next.getDate() + payInterval)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Keep advancing if the computed date is in the past
    while (next < today) {
      next.setDate(next.getDate() + payInterval)
    }

    // Project amount: average net_pay from last 3 non-bonus paystubs
    const recentForAvg = sorted
      .filter(p => {
        const bonus = Number(p.bonus_pay) || 0
        const gross = Number(p.gross_pay) || 1
        return bonus / gross < 0.2
      })
      .slice(0, 3)

    const avgNetPay =
      recentForAvg.length > 0
        ? recentForAvg.reduce((sum, p) => sum + Number(p.net_pay), 0) / recentForAvg.length
        : Number(sorted[0].net_pay)

    const diffMs = next.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    return {
      nextPayDate: next,
      projectedAmount: Math.round(avgNetPay * 100) / 100,
      daysUntil: diffDays,
      isPayday: diffDays <= 0,
    }
  }, [paystubs])

  // Recent uploaded pay dates (last 4)
  const recentUploads = useMemo(() => {
    if (paystubs.length === 0) return []
    const sorted = [...paystubs].sort(
      (a, b) => new Date(b.pay_date + 'T00:00:00').getTime() - new Date(a.pay_date + 'T00:00:00').getTime()
    )
    return sorted.slice(0, 4).map(p => ({
      date: new Date(p.pay_date + 'T00:00:00'),
      netPay: Number(p.net_pay),
    }))
  }, [paystubs])

  if (loading || !nextPayDate) return null

  const formattedDate = nextPayDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const formattedAmount = projectedAmount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.4 }}
      className="bg-white rounded-2xl p-5 border border-[#1F1410]/5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-[#10B981]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#1F1410]">Next Paycheck</h3>
            <p className="text-xs text-[#1F1410]/40">
              {isPayday ? 'Expected today' : `${formattedDate}`}
            </p>
          </div>
        </div>

        {!isPayday && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981]/10">
            <Clock className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="text-xs font-semibold text-[#10B981]">
              {daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xs text-[#1F1410]/40 mb-0.5">Projected Net Pay</p>
          <p className="text-2xl font-light text-[#1F1410]">{formattedAmount}</p>
        </div>

        {isPayday && (
          <motion.button
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onUploadClick}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#10B981] text-white text-sm font-semibold shadow-sm hover:bg-[#059669] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Paycheck
          </motion.button>
        )}
      </div>

      {/* Recent uploaded pay dates */}
      {recentUploads.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#1F1410]/5">
          <p className="text-xs font-medium text-[#1F1410]/40 mb-2">Recent Uploads</p>
          <div className="space-y-1.5">
            {recentUploads.map((upload, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[#1F1410]/70">
                    {upload.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <span className="text-[#1F1410]/50 font-medium">
                  {upload.netPay.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  )
}
