import {
  CircleDollarSign,
  Tag,
  Calendar,
  CreditCard,
  Hash,
  FileText,
  Split,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  GitMerge,
} from 'lucide-react'
import { SHADOWS } from '../../lib/styles'
import type { UITransaction } from '../views/TransactionsView'
import type { DuplicatePair } from '../../types/duplicateReconciliation'

type TransactionDetailPanelProps = {
  selectedTransaction: UITransaction | null
  duplicateMap: Map<string, DuplicatePair[]>
  onEdit: () => void
  onDelete: () => void
  onMarkAsReviewed: (transactionId: string) => void
  onSplit: () => void
  onReconcile: () => void
}

export function TransactionDetailPanel({
  selectedTransaction,
  duplicateMap,
  onEdit,
  onDelete,
  onMarkAsReviewed,
  onSplit,
  onReconcile,
}: TransactionDetailPanelProps) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden lg:sticky lg:top-8 h-fit"
      style={{ boxShadow: SHADOWS.card }}
    >
      {selectedTransaction ? (
        <div className="p-6">
          {/* Header with merchant and amount */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: selectedTransaction.color }}
              >
                <selectedTransaction.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#1F1410]">{selectedTransaction.merchant}</h3>
                <p
                  className="text-2xl font-bold"
                  style={{
                    color: selectedTransaction.type === 'income' ? '#10B981' :
                           selectedTransaction.type === 'transfer' ? '#8B5CF6' : '#1F1410'
                  }}
                >
                  {selectedTransaction.type === 'income' ? '+' : '-'}${selectedTransaction.displayAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Type */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                <CircleDollarSign className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div>
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Type</p>
                <p className="text-sm font-medium text-[#1F1410] capitalize">{selectedTransaction.type}</p>
              </div>
            </div>

            {/* Category */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                <Tag className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div>
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Category</p>
                <p className="text-sm font-medium" style={{ color: selectedTransaction.color }}>
                  {selectedTransaction.category}
                </p>
              </div>
            </div>

            {/* Date */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div>
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Date</p>
                <p className="text-sm font-medium text-[#1F1410]">
                  {new Date(selectedTransaction.rawDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>

            {/* Source */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#1F1410]/50" />
              </div>
              <div>
                <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Source</p>
                <p className="text-sm font-medium text-[#1F1410]">{selectedTransaction.source}</p>
              </div>
            </div>

            {/* Tags */}
            {selectedTransaction.tags && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center flex-shrink-0">
                  <Hash className="w-4 h-4 text-[#1F1410]/50" />
                </div>
                <div>
                  <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Tags</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTransaction.tags.split(',').map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#1F1410]/5 text-[#1F1410]/70"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedTransaction.notes && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1F1410]/5 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-[#1F1410]/50" />
                </div>
                <div>
                  <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide">Notes</p>
                  <p className="text-sm text-[#1F1410]/70 mt-0.5">{selectedTransaction.notes}</p>
                </div>
              </div>
            )}

            {/* Splits */}
            {selectedTransaction.splits.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/10 flex items-center justify-center flex-shrink-0">
                  <Split className="w-4 h-4 text-[#8B5CF6]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[#1F1410]/50 uppercase tracking-wide mb-2">Split Categories</p>
                  <div className="space-y-2">
                    {selectedTransaction.splits.map((split) => (
                      <div
                        key={split.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#1F1410]/[0.02]"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: split.color }}
                          />
                          <span className="text-sm text-[#1F1410]">
                            {split.category || 'Uncategorized'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-[#1F1410]">
                          ${Math.abs(split.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Potential Duplicate / Transfer Warning */}
          {duplicateMap.has(selectedTransaction.id) && (() => {
            const matchPairs = duplicateMap.get(selectedTransaction.id)!
            const hasTransfer = matchPairs.some(p => p.pairType === 'transfer')
            const hasDuplicate = matchPairs.some(p => p.pairType === 'duplicate')
            const bgColor = hasTransfer && !hasDuplicate ? '#8B5CF6' : '#F59E0B'
            const label = hasTransfer && !hasDuplicate
              ? 'Potential Transfer'
              : hasDuplicate && !hasTransfer
              ? 'Potential Duplicate'
              : 'Potential Duplicate / Transfer'
            const textColor = hasTransfer && !hasDuplicate ? '#6D28D9' : '#92400E'
            const textColorHover = hasTransfer && !hasDuplicate ? '#5B21B6' : '#78350F'

            return (
              <div className="mt-4 p-3 rounded-xl border" style={{ backgroundColor: `${bgColor}10`, borderColor: `${bgColor}33` }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: bgColor }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: textColor }}>
                      {label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: `${textColor}B3` }}>
                      {matchPairs.length} possible {matchPairs.length === 1 ? 'match' : 'matches'} found
                    </p>
                    <button
                      onClick={onReconcile}
                      className="flex items-center gap-1.5 mt-2 text-xs font-medium transition-colors"
                      style={{ color: textColor }}
                      onMouseEnter={e => (e.currentTarget.style.color = textColorHover)}
                      onMouseLeave={e => (e.currentTarget.style.color = textColor)}
                    >
                      <GitMerge className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Action Buttons */}
          <div className="flex items-center gap-4 mt-6 pt-6 border-t border-[#1F1410]/5">
            {selectedTransaction.needs_review && (
              <button
                onClick={() => onMarkAsReviewed(selectedTransaction.id)}
                className="flex items-center gap-1.5 text-sm text-[#3B82F6] hover:text-[#2563EB] transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark Reviewed
              </button>
            )}
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-[#1F1410] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </button>
            <button
              onClick={onSplit}
              className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-[#8B5CF6] transition-colors"
            >
              <Split className="w-3.5 h-3.5" />
              {selectedTransaction.splits.length > 0 ? 'Edit Split' : 'Split'}
            </button>
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <CircleDollarSign className="w-12 h-12 text-[#1F1410]/10 mx-auto mb-3" />
          <p className="text-[#1F1410]/40 text-sm">Select a transaction to view details</p>
        </div>
      )}
    </div>
  )
}
