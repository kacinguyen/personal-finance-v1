/**
 * Batch Import type definitions
 * Used for batch PDF paystub imports
 */

import type { ImportResult } from '../lib/paystubImport'
import type { PaystubInsert } from './paystub'

export type BatchItemStatus = 'pending' | 'processing' | 'success' | 'error' | 'skipped'

export interface BatchPDFItem {
  id: string
  file: File
  fileName: string
  status: BatchItemStatus
  result: ImportResult | null
  error?: string
  /** User-edited paystub data for saving */
  editedData?: PaystubInsert
}

export interface BatchProcessUpdate {
  itemId: string
  status: BatchItemStatus
  result?: ImportResult | null
  error?: string
}

export interface BatchSaveResult {
  itemId: string
  success: boolean
  paystubId?: string
  error?: string
  autoContributions?: number
}
