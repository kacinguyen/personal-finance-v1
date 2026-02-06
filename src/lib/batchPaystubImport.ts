/**
 * Batch Paystub Import Library
 *
 * Handles processing multiple PDF paystubs in parallel with concurrency control,
 * duplicate detection, and batch saving.
 */

import { supabase } from './supabase'
import { processPaystubPDF, parsedToInsert, savePaystub } from './paystubImport'
import type {
  BatchPDFItem,
  BatchProcessUpdate,
  BatchSaveResult,
} from '../types/batchImport'
import type { PaystubInsert } from '../types/paystub'

/**
 * Generate a unique ID for batch items
 */
export function generateBatchItemId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Create BatchPDFItem objects from File array
 */
export function createBatchItems(files: File[]): BatchPDFItem[] {
  return files.map((file) => ({
    id: generateBatchItemId(),
    file,
    fileName: file.name,
    status: 'pending',
    result: null,
  }))
}

/**
 * Process multiple PDF files with concurrency control
 *
 * @param items - Array of BatchPDFItem to process
 * @param maxConcurrent - Maximum concurrent PDF processing (default: 3)
 * @param onUpdate - Callback for progress updates
 */
export async function processBatchPDFs(
  items: BatchPDFItem[],
  maxConcurrent: number = 3,
  onUpdate: (update: BatchProcessUpdate) => void
): Promise<BatchPDFItem[]> {
  const results: BatchPDFItem[] = [...items]
  let currentIndex = 0

  const processOne = async (): Promise<void> => {
    while (currentIndex < items.length) {
      const index = currentIndex++
      const item = items[index]

      // Mark as processing
      onUpdate({
        itemId: item.id,
        status: 'processing',
      })

      try {
        const result = await processPaystubPDF(item.file)

        if (result.success) {
          results[index] = {
            ...item,
            status: 'success',
            result,
          }
          onUpdate({
            itemId: item.id,
            status: 'success',
            result,
          })
        } else {
          results[index] = {
            ...item,
            status: 'error',
            result: null,
            error: result.error || 'Failed to process PDF',
          }
          onUpdate({
            itemId: item.id,
            status: 'error',
            error: result.error || 'Failed to process PDF',
          })
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        results[index] = {
          ...item,
          status: 'error',
          result: null,
          error: errorMessage,
        }
        onUpdate({
          itemId: item.id,
          status: 'error',
          error: errorMessage,
        })
      }
    }
  }

  // Start concurrent workers
  const workers = Array(Math.min(maxConcurrent, items.length))
    .fill(null)
    .map(() => processOne())

  await Promise.all(workers)

  return results
}

/**
 * Check if a paystub with the same pay date and gross pay already exists
 * This helps prevent duplicate imports
 */
export async function checkDuplicatePaystub(
  payDate: string,
  grossPay: number,
  userId: string
): Promise<{ isDuplicate: boolean; existingId?: string }> {
  const { data, error } = await supabase
    .from('paystubs')
    .select('id, pay_date, gross_pay')
    .eq('user_id', userId)
    .eq('pay_date', payDate)
    .gte('gross_pay', grossPay - 0.01)
    .lte('gross_pay', grossPay + 0.01)
    .limit(1)

  if (error) {
    console.error('Error checking for duplicate paystub:', error)
    return { isDuplicate: false }
  }

  if (data && data.length > 0) {
    return { isDuplicate: true, existingId: data[0].id }
  }

  return { isDuplicate: false }
}

/**
 * Save all approved batch items to the database
 *
 * @param items - BatchPDFItems with success status and optional editedData
 * @param userId - User ID to associate paystubs with
 * @param onSaved - Callback after each item is saved
 */
export async function saveBatchPaystubs(
  items: BatchPDFItem[],
  userId: string,
  onSaved?: (result: BatchSaveResult) => void
): Promise<BatchSaveResult[]> {
  const results: BatchSaveResult[] = []

  // Filter to only items with success status (and not skipped)
  const itemsToSave = items.filter(
    (item) => item.status === 'success' && item.result?.parsedData
  )

  for (const item of itemsToSave) {
    try {
      // Use editedData if available, otherwise convert from parsed data
      let insertData: PaystubInsert
      if (item.editedData) {
        insertData = item.editedData
      } else if (item.result?.parsedData) {
        insertData = parsedToInsert(item.result.parsedData, item.fileName)
      } else {
        const result: BatchSaveResult = {
          itemId: item.id,
          success: false,
          error: 'No data to save',
        }
        results.push(result)
        onSaved?.(result)
        continue
      }

      // Check for duplicates before saving
      const { isDuplicate, existingId } = await checkDuplicatePaystub(
        insertData.pay_date,
        insertData.gross_pay,
        userId
      )

      if (isDuplicate) {
        const result: BatchSaveResult = {
          itemId: item.id,
          success: false,
          paystubId: existingId,
          error: `Duplicate paystub found for ${insertData.pay_date}`,
        }
        results.push(result)
        onSaved?.(result)
        continue
      }

      // Save the paystub
      const saveResult = await savePaystub(insertData, userId)

      const result: BatchSaveResult = {
        itemId: item.id,
        success: saveResult.success,
        paystubId: saveResult.id,
        error: saveResult.error,
        autoContributions: saveResult.autoContributions,
      }
      results.push(result)
      onSaved?.(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      const result: BatchSaveResult = {
        itemId: item.id,
        success: false,
        error: errorMessage,
      }
      results.push(result)
      onSaved?.(result)
    }
  }

  return results
}

/**
 * Get batch processing statistics
 */
export function getBatchStats(items: BatchPDFItem[]): {
  total: number
  pending: number
  processing: number
  success: number
  error: number
  skipped: number
  completedPercent: number
} {
  const stats = {
    total: items.length,
    pending: 0,
    processing: 0,
    success: 0,
    error: 0,
    skipped: 0,
    completedPercent: 0,
  }

  for (const item of items) {
    switch (item.status) {
      case 'pending':
        stats.pending++
        break
      case 'processing':
        stats.processing++
        break
      case 'success':
        stats.success++
        break
      case 'error':
        stats.error++
        break
      case 'skipped':
        stats.skipped++
        break
    }
  }

  const completed = stats.success + stats.error + stats.skipped
  stats.completedPercent = stats.total > 0 ? Math.round((completed / stats.total) * 100) : 0

  return stats
}
