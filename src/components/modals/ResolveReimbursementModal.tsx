import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, XCircle, ArrowRight, Sparkles } from 'lucide-react'
import type { PendingReimbursement } from '../../types/pendingReimbursement'
import { findReimbursementMatches } from '../../lib/reimbursementMatcher'
import type { MatchSuggestion, MatchConfidence } from '../../lib/reimbursementMatcher'

type MatchableTransaction = {
  id: string
  merchant: string
  amount: number
  date: string
  source: string
  category: string | null
}

type ResolveReimbursementModalProps = {
  isOpen: boolean
  onClose: () => void
  reimbursement: PendingReimbursement | null
  originalMerchant: string
  originalDate: string
  incomingTransactions: MatchableTransaction[]
  onResolve: (reimbursementId: string, resolvedTransactionId: string | null) => Promise<void>
  onWriteOff: (reimbursementId: string) => Promise<void>
}

const CONFIDENCE_STYLES: Record<MatchConfidence, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', label: 'High match' },
  medium: { bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Possible match' },
  low: { bg: 'bg-[#1F1410]/5', text: 'text-[#1F1410]/50', label: 'Low match' },
}

export function ResolveReimbursementModal({
  isOpen,
  onClose,
  reimbursement,
  originalMerchant,
  originalDate,
  incomingTransactions,
  onResolve,
  onWriteOff,
}: ResolveReimbursementModalProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const suggestions = useMemo<MatchSuggestion[]>(() => {
    if (!reimbursement) return []
    return findReimbursementMatches([reimbursement], incomingTransactions)
  }, [reimbursement, incomingTransactions])

  const handleResolveWithMatch = async (matchTxId: string) => {
    if (!reimbursement) return
    setSaving(true)
    setError(null)
    try {
      await onResolve(reimbursement.id, matchTxId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve')
    } finally {
      setSaving(false)
    }
  }

  const handleManualResolve = async () => {
    if (!reimbursement) return
    setSaving(true)
    setError(null)
    try {
      await onResolve(reimbursement.id, null)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve')
    } finally {
      setSaving(false)
    }
  }

  const handleWriteOff = async () => {
    if (!reimbursement) return
    setSaving(true)
    setError(null)
    try {
      await onWriteOff(reimbursement.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to write off')
    } finally {
      setSaving(false)
    }
  }

  if (!reimbursement) return null

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
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col pointer-events-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F1410]/5 flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-[#1F1410]">Resolve Reimbursement</h3>
                  <p className="text-xs text-[#1F1410]/40 mt-0.5">
                    {originalMerchant} &middot; {new Date(originalDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
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
                {/* Amount owed */}
                <div className="p-3 rounded-xl bg-[#F59E0B]/5 border border-[#F59E0B]/10">
                  <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/40 mb-1">Amount Owed</p>
                  <p className="text-xl font-bold text-[#F59E0B]">
                    ${reimbursement.others_share.toFixed(2)}
                  </p>
                  {reimbursement.notes && (
                    <p className="text-xs text-[#1F1410]/40 mt-1">{reimbursement.notes}</p>
                  )}
                </div>

                {/* Auto-suggested matches */}
                {suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 mb-3">
                      <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <p className="text-[10px] uppercase tracking-wider text-[#1F1410]/40">
                        Suggested Matches
                      </p>
                    </div>
                    <div className="space-y-2">
                      {suggestions.map((match) => {
                        const style = CONFIDENCE_STYLES[match.confidence]
                        return (
                          <button
                            key={match.transaction.id}
                            disabled={saving}
                            onClick={() => handleResolveWithMatch(match.transaction.id)}
                            className="w-full text-left p-3 rounded-xl border border-[#1F1410]/5 hover:border-[#10B981]/30 hover:bg-[#10B981]/[0.02] transition-colors group disabled:opacity-50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-[#1F1410] truncate">
                                    {match.transaction.merchant}
                                  </p>
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                                    {style.label}
                                  </span>
                                </div>
                                <p className="text-xs text-[#1F1410]/40 mt-0.5">
                                  {match.reason} &middot;{' '}
                                  {new Date(match.transaction.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  {match.transaction.source && ` &middot; ${match.transaction.source}`}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <span className="text-sm font-semibold text-[#10B981]">
                                  +${match.transaction.amount.toFixed(2)}
                                </span>
                                <ArrowRight className="w-4 h-4 text-[#1F1410]/20 group-hover:text-[#10B981] transition-colors" />
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {suggestions.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-[#1F1410]/40">No matching incoming payments found</p>
                    <p className="text-xs text-[#1F1410]/30 mt-1">You can manually resolve or write off this reimbursement</p>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-[#FF6B6B]">{error}</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-4 border-t border-[#1F1410]/5 flex-shrink-0 flex items-center justify-between">
                <button
                  disabled={saving}
                  onClick={handleWriteOff}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#FF6B6B]/70 hover:text-[#FF6B6B] transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Write Off
                </button>
                <button
                  disabled={saving}
                  onClick={handleManualResolve}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#1F1410] rounded-lg hover:bg-[#1F1410]/90 transition-colors disabled:opacity-40"
                >
                  <Check className="w-3.5 h-3.5" />
                  {saving ? 'Resolving...' : 'Mark as Resolved'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
