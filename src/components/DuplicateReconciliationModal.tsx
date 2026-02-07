import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GitMerge,
  ArrowLeftRight,
  Ban,
  SkipForward,
} from 'lucide-react'
import { useDuplicateReconciliation } from '../hooks/useDuplicateReconciliation'
import type { Transaction } from '../types/transaction'
import type { DuplicatePair, DuplicateAction } from '../types/duplicateReconciliation'

interface DuplicateReconciliationModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  onComplete: () => void
}

export function DuplicateReconciliationModal({
  isOpen,
  onClose,
  transactions,
  onComplete,
}: DuplicateReconciliationModalProps) {
  const {
    step,
    pairs,
    result,
    runDetection,
    setPairAction,
    swapKeepTransaction,
    executeReconciliation,
  } = useDuplicateReconciliation(transactions, onComplete)

  // Run detection when modal opens
  useEffect(() => {
    if (isOpen) {
      runDetection()
    }
  }, [isOpen, runDetection])

  if (!isOpen) return null

  const actionablePairs = pairs.filter(p => p.action !== 'skip')
  const mergePairs = pairs.filter(p => p.action === 'merge')

  const stepLabel =
    step === 'detecting' ? 'Scanning for duplicates...' :
    step === 'review' ? `${pairs.length} potential duplicate${pairs.length !== 1 ? 's' : ''} found` :
    step === 'processing' ? 'Processing...' :
    'Reconciliation complete'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1410]/40 backdrop-blur-sm"
        onClick={() => step !== 'processing' && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1410]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#8B5CF6]/10 flex items-center justify-center">
                <GitMerge className="w-5 h-5 text-[#8B5CF6]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F1410]">Reconcile Duplicates</h2>
                <p className="text-sm text-[#1F1410]/50">{stepLabel}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={step === 'processing'}
              className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-[#1F1410]/60" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Detecting step */}
            {step === 'detecting' && (
              <div className="py-12 text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 border-2 border-[#8B5CF6] border-t-transparent rounded-full mx-auto mb-4"
                />
                <p className="text-[#1F1410]/50">Analyzing transactions for duplicates...</p>
              </div>
            )}

            {/* Review step */}
            {step === 'review' && pairs.length === 0 && (
              <div className="py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-[#10B981] mx-auto mb-3" />
                <h3 className="text-lg font-bold text-[#1F1410] mb-1">No Duplicates Found</h3>
                <p className="text-sm text-[#1F1410]/50">
                  Your transactions look clean — no potential duplicates detected.
                </p>
              </div>
            )}

            {step === 'review' && pairs.length > 0 && (
              <div className="space-y-4">
                {/* Summary badges */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                    {pairs.filter(p => p.confidence === 'exact').length} exact
                  </span>
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    {pairs.filter(p => p.confidence === 'fuzzy').length} fuzzy
                  </span>
                </div>

                {/* Pair rows */}
                <div className="space-y-3">
                  {pairs.map(pair => (
                    <DuplicatePairRow
                      key={pair.id}
                      pair={pair}
                      onActionChange={(action) => setPairAction(pair.id, action)}
                      onSwapKeep={() => swapKeepTransaction(pair.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Processing step */}
            {step === 'processing' && (
              <div className="py-12 text-center">
                <Loader2 className="w-10 h-10 text-[#8B5CF6] animate-spin mx-auto mb-4" />
                <p className="text-[#1F1410]/50">Processing reconciliation...</p>
              </div>
            )}

            {/* Complete step */}
            {step === 'complete' && result && (
              <div className="py-8 text-center">
                {result.mergedCount + result.dismissedCount > 0 ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#1F1410] mb-2">Reconciliation Complete</h3>
                    <div className="flex items-center justify-center gap-4 text-sm text-[#1F1410]/60 mb-4">
                      {result.mergedCount > 0 && (
                        <span>{result.mergedCount} merged</span>
                      )}
                      {result.dismissedCount > 0 && (
                        <span>{result.dismissedCount} dismissed</span>
                      )}
                      {result.skippedCount > 0 && (
                        <span>{result.skippedCount} skipped</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#1F1410] mb-2">No Changes Made</h3>
                    <p className="text-sm text-[#1F1410]/60 mb-4">All pairs were skipped</p>
                  </>
                )}

                {result.errors.length > 0 && (
                  <div className="bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 rounded-xl p-4 mt-4 text-left">
                    <p className="text-sm font-medium text-[#FF6B6B] mb-2">Some items had errors:</p>
                    <ul className="text-xs text-[#FF6B6B]/80 space-y-1">
                      {result.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>• ...and {result.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#1F1410]/10 bg-[#1F1410]/[0.02]">
            <div />
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                disabled={step === 'processing'}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors disabled:opacity-50"
              >
                {step === 'complete' || (step === 'review' && pairs.length === 0) ? 'Close' : 'Cancel'}
              </button>
              {step === 'review' && pairs.length > 0 && (
                <button
                  onClick={executeReconciliation}
                  disabled={actionablePairs.length === 0}
                  className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GitMerge className="w-4 h-4" />
                  Process ({mergePairs.length} merge, {pairs.filter(p => p.action === 'dismiss').length} dismiss)
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ───── Pair Row Sub-component ─────

function DuplicatePairRow({
  pair,
  onActionChange,
  onSwapKeep,
}: {
  pair: DuplicatePair
  onActionChange: (action: DuplicateAction) => void
  onSwapKeep: () => void
}) {
  const keep =
    pair.keepTransactionId === pair.transactionA.id
      ? pair.transactionA
      : pair.transactionB
  const discard =
    pair.keepTransactionId === pair.transactionA.id
      ? pair.transactionB
      : pair.transactionA

  const confidenceColor = pair.confidence === 'exact' ? '#10B981' : '#F59E0B'

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-all ${
        pair.action === 'skip'
          ? 'border-[#1F1410]/10 bg-[#1F1410]/[0.02] opacity-60'
          : pair.action === 'dismiss'
          ? 'border-[#F59E0B]/20 bg-[#F59E0B]/[0.02]'
          : 'border-[#1F1410]/10 bg-white'
      }`}
    >
      {/* Confidence badge + match reasons */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${confidenceColor}15`, color: confidenceColor }}
        >
          {pair.confidence} match
        </span>
        {pair.matchReasons.map((reason, i) => (
          <span key={i} className="text-[10px] text-[#1F1410]/40">
            {reason}
          </span>
        ))}
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-3">
        {/* Keep transaction */}
        <div className="rounded-lg border-2 border-[#10B981]/30 bg-[#10B981]/[0.03] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            <span className="text-[10px] font-semibold text-[#10B981] uppercase">Keep</span>
            <span className="text-[10px] text-[#1F1410]/30 ml-auto">{keep.source}</span>
          </div>
          <p className="text-sm font-medium text-[#1F1410] truncate">{keep.merchant}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#1F1410]/50">{keep.date}</span>
            <span className="text-xs font-medium text-[#1F1410]">
              ${Math.abs(keep.amount).toFixed(2)}
            </span>
          </div>
          {(keep.category || keep.tags || keep.notes) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {keep.category && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F1410]/5 text-[#1F1410]/50">
                  {keep.category}
                </span>
              )}
              {keep.tags && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F1410]/5 text-[#1F1410]/50">
                  tags: {keep.tags}
                </span>
              )}
              {keep.notes && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F1410]/5 text-[#1F1410]/50 truncate max-w-full">
                  {keep.notes}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Discard transaction */}
        <div className="rounded-lg border border-[#1F1410]/10 bg-[#1F1410]/[0.02] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#1F1410]/30" />
            <span className="text-[10px] font-semibold text-[#1F1410]/40 uppercase">Remove</span>
            <span className="text-[10px] text-[#1F1410]/30 ml-auto">{discard.source}</span>
          </div>
          <p className="text-sm font-medium text-[#1F1410]/60 truncate">{discard.merchant}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-[#1F1410]/40">{discard.date}</span>
            <span className="text-xs font-medium text-[#1F1410]/60">
              ${Math.abs(discard.amount).toFixed(2)}
            </span>
          </div>
          {(discard.category || discard.tags || discard.notes) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {discard.category && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F1410]/5 text-[#1F1410]/40">
                  {discard.category}
                </span>
              )}
              {discard.tags && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F1410]/5 text-[#1F1410]/40">
                  tags: {discard.tags}
                </span>
              )}
              {discard.notes && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1F1410]/5 text-[#1F1410]/40 truncate max-w-full">
                  {discard.notes}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1F1410]/5">
        {/* Swap button */}
        <button
          onClick={onSwapKeep}
          className="flex items-center gap-1 text-xs text-[#1F1410]/40 hover:text-[#8B5CF6] transition-colors"
        >
          <ArrowLeftRight className="w-3 h-3" />
          Swap
        </button>

        {/* Action toggles */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onActionChange('merge')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              pair.action === 'merge'
                ? 'bg-[#10B981]/10 text-[#10B981]'
                : 'text-[#1F1410]/40 hover:bg-[#1F1410]/5'
            }`}
          >
            <GitMerge className="w-3 h-3" />
            Merge
          </button>
          <button
            onClick={() => onActionChange('dismiss')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              pair.action === 'dismiss'
                ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                : 'text-[#1F1410]/40 hover:bg-[#1F1410]/5'
            }`}
          >
            <Ban className="w-3 h-3" />
            Not a Duplicate
          </button>
          <button
            onClick={() => onActionChange('skip')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              pair.action === 'skip'
                ? 'bg-[#1F1410]/10 text-[#1F1410]/60'
                : 'text-[#1F1410]/40 hover:bg-[#1F1410]/5'
            }`}
          >
            <SkipForward className="w-3 h-3" />
            Skip
          </button>
        </div>
      </div>
    </div>
  )
}
