import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, Percent, DollarSign } from 'lucide-react'

type SplitMode = 'percentage' | 'dollar'

type SplitWithOthersModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (userShare: number, othersShare: number, splitPercentage: number | null, notes: string | null) => Promise<void>
  onRemove?: () => Promise<void>
  transactionAmount: number
  transactionMerchant: string
  existingSplit?: {
    userShare: number
    othersShare: number
    splitPercentage: number | null
    notes: string | null
  } | null
}

const PERCENTAGE_PRESETS = [
  { label: '50%', value: 50 },
  { label: '33%', value: 33.33 },
  { label: '25%', value: 25 },
  { label: '75%', value: 75 },
]

export function SplitWithOthersModal({
  isOpen,
  onClose,
  onSave,
  onRemove,
  transactionAmount,
  transactionMerchant,
  existingSplit,
}: SplitWithOthersModalProps) {
  const [mode, setMode] = useState<SplitMode>('percentage')
  const [percentage, setPercentage] = useState<string>('50')
  const [dollarAmount, setDollarAmount] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const absoluteAmount = Math.abs(transactionAmount)

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null)
      setSaving(false)
      if (existingSplit) {
        const existingPct = existingSplit.splitPercentage
        if (existingPct !== null) {
          setMode('percentage')
          setPercentage(String(existingPct))
        } else {
          setMode('dollar')
          setDollarAmount(String(Math.abs(existingSplit.userShare).toFixed(2)))
        }
        setNotes(existingSplit.notes || '')
      } else {
        setMode('percentage')
        setPercentage('50')
        setDollarAmount('')
        setNotes('')
      }
    }
  }, [isOpen, existingSplit, absoluteAmount])

  const computed = useMemo(() => {
    let userShare: number
    let othersShare: number
    let splitPct: number | null = null

    if (mode === 'percentage') {
      const pct = parseFloat(percentage) || 0
      splitPct = pct
      userShare = Math.round(absoluteAmount * (pct / 100) * 100) / 100
      othersShare = Math.round((absoluteAmount - userShare) * 100) / 100
    } else {
      userShare = parseFloat(dollarAmount) || 0
      userShare = Math.round(userShare * 100) / 100
      othersShare = Math.round((absoluteAmount - userShare) * 100) / 100
    }

    return { userShare, othersShare, splitPct }
  }, [mode, percentage, dollarAmount, absoluteAmount])

  const isValid = computed.userShare > 0 && computed.userShare < absoluteAmount && computed.othersShare > 0

  const handleSave = async () => {
    if (!isValid) return
    setSaving(true)
    setError(null)
    try {
      // userShare is negative for expenses (same sign as original)
      const signedUserShare = transactionAmount < 0 ? -computed.userShare : computed.userShare
      await onSave(signedUserShare, computed.othersShare, computed.splitPct, notes || null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save split')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1F1410]/40 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F1410]/5 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#1F1410]">Split with Others</h3>
                    <p className="text-xs text-[#1F1410]/40">{transactionMerchant}</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#1F1410]/30 hover:text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto flex-1 space-y-5">
                {/* Total amount display */}
                <div className="p-3 rounded-xl bg-[#1F1410]/5">
                  <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/40 mb-1">Total Amount</p>
                  <p className="text-xl font-bold text-[#1F1410]">
                    -${absoluteAmount.toFixed(2)}
                  </p>
                </div>

                {/* Mode toggle */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/40 mb-2">Split By</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setMode('percentage')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        mode === 'percentage'
                          ? 'bg-[#F59E0B] text-white'
                          : 'bg-[#1F1410]/5 text-[#1F1410]/60 hover:bg-[#1F1410]/10'
                      }`}
                    >
                      <Percent className="w-3.5 h-3.5" />
                      Percentage
                    </button>
                    <button
                      onClick={() => setMode('dollar')}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        mode === 'dollar'
                          ? 'bg-[#F59E0B] text-white'
                          : 'bg-[#1F1410]/5 text-[#1F1410]/60 hover:bg-[#1F1410]/10'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Dollar Amount
                    </button>
                  </div>
                </div>

                {/* Input */}
                {mode === 'percentage' ? (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/40 mb-2">Your Share</p>
                    {/* Presets */}
                    <div className="flex gap-2 mb-3">
                      {PERCENTAGE_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          onClick={() => setPercentage(String(preset.value))}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            parseFloat(percentage) === preset.value
                              ? 'bg-[#F59E0B]/15 text-[#F59E0B] ring-1 ring-[#F59E0B]/30'
                              : 'bg-[#1F1410]/5 text-[#1F1410]/50 hover:bg-[#1F1410]/10'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="1"
                        max="99"
                        step="0.01"
                        value={percentage}
                        onChange={(e) => setPercentage(e.target.value)}
                        className="w-full border border-[#1F1410]/10 rounded-lg px-4 py-2.5 pr-8 text-sm text-[#1F1410] outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B]/40 transition-all"
                        placeholder="50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#1F1410]/30">%</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/40 mb-2">Your Share</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#1F1410]/30">$</span>
                      <input
                        type="number"
                        min="0.01"
                        max={absoluteAmount - 0.01}
                        step="0.01"
                        value={dollarAmount}
                        onChange={(e) => setDollarAmount(e.target.value)}
                        className="w-full border border-[#1F1410]/10 rounded-lg pl-7 pr-4 py-2.5 text-sm text-[#1F1410] outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B]/40 transition-all"
                        placeholder={String((absoluteAmount / 2).toFixed(2))}
                      />
                    </div>
                  </div>
                )}

                {/* Live preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#10B981]/5 border border-[#10B981]/10">
                    <span className="text-sm text-[#1F1410]/60">Your share</span>
                    <span className="text-sm font-semibold text-[#10B981]">
                      -${computed.userShare.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/10">
                    <span className="text-sm text-[#1F1410]/60">Pending reimbursement</span>
                    <span className="text-sm font-semibold text-[#F59E0B]">
                      ${computed.othersShare.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/40 mb-2">Notes (optional)</p>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-[#1F1410]/10 rounded-lg px-4 py-2.5 text-sm text-[#1F1410] outline-none focus:ring-2 focus:ring-[#F59E0B]/30 focus:border-[#F59E0B]/40 transition-all"
                    placeholder="e.g., Dinner with Alex and Sam"
                  />
                </div>

                {error && (
                  <p className="text-sm text-[#FF6B6B]">{error}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-[#1F1410]/5 flex-shrink-0 flex items-center justify-between">
                {existingSplit && onRemove ? (
                  <button
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true)
                      try {
                        await onRemove()
                        onClose()
                      } finally {
                        setSaving(false)
                      }
                    }}
                    className="px-3 py-2 text-sm font-medium text-[#FF6B6B]/70 hover:text-[#FF6B6B] transition-colors disabled:opacity-50"
                  >
                    Remove Split
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-[#1F1410]/50 hover:text-[#1F1410]/80 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  disabled={!isValid || saving}
                  onClick={handleSave}
                  className="px-5 py-2 text-sm font-medium text-white bg-[#1F1410] rounded-lg hover:bg-[#1F1410]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : existingSplit ? 'Update Split' : 'Split Transaction'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
