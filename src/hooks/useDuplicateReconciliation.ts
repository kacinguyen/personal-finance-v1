import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  detectDuplicates,
  computeMergedFields,
  detectTransferPairs,
  computeTransferMergedFields,
} from '../lib/duplicateDetection'
import type { AccountTypeMap } from '../lib/duplicateDetection'
import type { Transaction } from '../types/transaction'
import type {
  DuplicatePair,
  DuplicateAction,
  ReconciliationStep,
  ReconciliationResult,
} from '../types/duplicateReconciliation'

const DISMISSED_PAIRS_KEY = 'duplicate-reconciliation-dismissed'

function loadDismissedPairIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_PAIRS_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    // ignore corrupt localStorage
  }
  return new Set()
}

function saveDismissedPairIds(ids: Set<string>) {
  localStorage.setItem(DISMISSED_PAIRS_KEY, JSON.stringify([...ids]))
}

export function useDuplicateReconciliation(
  transactions: Transaction[],
  onComplete: () => void,
  options?: {
    accountTypeMap?: AccountTypeMap
    transferCategoryId?: string
    transferCategoryName?: string
  }
) {
  const [step, setStep] = useState<ReconciliationStep>('detecting')
  const [pairs, setPairs] = useState<DuplicatePair[]>([])
  const [result, setResult] = useState<ReconciliationResult | null>(null)

  const accountTypeMap = options?.accountTypeMap
  const transferCategoryId = options?.transferCategoryId
  const transferCategoryName = options?.transferCategoryName

  /** Run detection against the provided transactions */
  const runDetection = useCallback(() => {
    setStep('detecting')
    setResult(null)

    // Use setTimeout so the detecting spinner renders before blocking
    setTimeout(() => {
      const dismissed = loadDismissedPairIds()
      const duplicates = detectDuplicates(transactions, dismissed)

      let transfers: DuplicatePair[] = []
      if (accountTypeMap && accountTypeMap.size > 0) {
        transfers = detectTransferPairs(transactions, accountTypeMap, dismissed)
      }

      setPairs([...duplicates, ...transfers])
      setStep('review')
    }, 50)
  }, [transactions, accountTypeMap])

  /** Set action for a specific pair */
  const setPairAction = useCallback((pairId: string, action: DuplicateAction) => {
    setPairs(prev => prev.map(p => (p.id === pairId ? { ...p, action } : p)))
  }, [])

  /** Swap which transaction to keep in a pair */
  const swapKeepTransaction = useCallback((pairId: string) => {
    setPairs(prev =>
      prev.map(p => {
        if (p.id !== pairId) return p
        const newKeepId =
          p.keepTransactionId === p.transactionA.id
            ? p.transactionB.id
            : p.transactionA.id
        return { ...p, keepTransactionId: newKeepId }
      })
    )
  }, [])

  /** Execute all reconciliation actions */
  const executeReconciliation = useCallback(async () => {
    setStep('processing')

    const errors: string[] = []
    let mergedCount = 0
    let dismissedCount = 0
    let skippedCount = 0

    const dismissedIds = loadDismissedPairIds()

    for (const pair of pairs) {
      if (pair.action === 'skip') {
        skippedCount++
        continue
      }

      if (pair.action === 'dismiss') {
        dismissedIds.add(pair.id)
        dismissedCount++
        continue
      }

      // Merge
      const keep =
        pair.keepTransactionId === pair.transactionA.id
          ? pair.transactionA
          : pair.transactionB
      const discard =
        pair.keepTransactionId === pair.transactionA.id
          ? pair.transactionB
          : pair.transactionA

      try {
        // Compute fields to adopt from discarded tx
        const mergedFields =
          pair.pairType === 'transfer' && transferCategoryId && transferCategoryName
            ? computeTransferMergedFields(keep, discard, transferCategoryId, transferCategoryName)
            : computeMergedFields(keep, discard)

        // Update kept transaction with merged fields if any
        if (Object.keys(mergedFields).length > 0) {
          const { error: updateError } = await supabase
            .from('transactions')
            .update(mergedFields)
            .eq('id', keep.id)

          if (updateError) {
            errors.push(`Failed to update ${keep.merchant}: ${updateError.message}`)
            continue
          }
        }

        // Re-parent splits from discarded tx to kept tx
        const { error: reparentError } = await supabase
          .from('transaction_splits')
          .update({ transaction_id: keep.id })
          .eq('transaction_id', discard.id)

        if (reparentError) {
          errors.push(`Failed to re-parent splits for ${discard.merchant}: ${reparentError.message}`)
          // Continue to delete anyway — splits will cascade
        }

        // Delete the discarded transaction (splits cascade)
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', discard.id)

        if (deleteError) {
          errors.push(`Failed to delete ${discard.merchant}: ${deleteError.message}`)
          continue
        }

        mergedCount++
      } catch (err) {
        errors.push(
          `Unexpected error merging ${keep.merchant}: ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }

    // Persist dismissed pairs
    saveDismissedPairIds(dismissedIds)

    const finalResult: ReconciliationResult = {
      mergedCount,
      dismissedCount,
      skippedCount,
      errors,
    }

    setResult(finalResult)
    setStep('complete')

    // Refresh the transactions list
    if (mergedCount > 0) {
      onComplete()
    }
  }, [pairs, onComplete])

  return {
    step,
    pairs,
    result,
    runDetection,
    setPairAction,
    swapKeepTransaction,
    executeReconciliation,
  }
}
