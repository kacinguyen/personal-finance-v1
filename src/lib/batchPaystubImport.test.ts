import { describe, it, expect, vi } from 'vitest'
import {
  generateBatchItemId,
  createBatchItems,
  getBatchStats,
} from './batchPaystubImport'
import type { BatchPDFItem } from '../types/batchImport'

describe('generateBatchItemId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateBatchItemId()
    const id2 = generateBatchItemId()

    expect(id1).not.toBe(id2)
    expect(id1).toMatch(/^batch_\d+_[a-z0-9]+$/)
  })

  it('should start with "batch_" prefix', () => {
    const id = generateBatchItemId()
    expect(id.startsWith('batch_')).toBe(true)
  })
})

describe('createBatchItems', () => {
  it('should create BatchPDFItem objects from files', () => {
    const mockFiles = [
      new File(['content1'], 'paystub1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'paystub2.pdf', { type: 'application/pdf' }),
      new File(['content3'], 'paystub3.pdf', { type: 'application/pdf' }),
    ]

    const items = createBatchItems(mockFiles)

    expect(items).toHaveLength(3)
    expect(items[0].fileName).toBe('paystub1.pdf')
    expect(items[0].status).toBe('pending')
    expect(items[0].result).toBeNull()
    expect(items[0].file).toBe(mockFiles[0])
  })

  it('should assign unique IDs to each item', () => {
    const mockFiles = [
      new File(['content1'], 'paystub1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'paystub2.pdf', { type: 'application/pdf' }),
    ]

    const items = createBatchItems(mockFiles)

    expect(items[0].id).not.toBe(items[1].id)
  })

  it('should handle empty file array', () => {
    const items = createBatchItems([])
    expect(items).toHaveLength(0)
  })
})

describe('getBatchStats', () => {
  it('should count items by status', () => {
    const items: BatchPDFItem[] = [
      { id: '1', file: new File([], 'a.pdf'), fileName: 'a.pdf', status: 'pending', result: null },
      { id: '2', file: new File([], 'b.pdf'), fileName: 'b.pdf', status: 'processing', result: null },
      { id: '3', file: new File([], 'c.pdf'), fileName: 'c.pdf', status: 'success', result: null },
      { id: '4', file: new File([], 'd.pdf'), fileName: 'd.pdf', status: 'success', result: null },
      { id: '5', file: new File([], 'e.pdf'), fileName: 'e.pdf', status: 'error', result: null, error: 'Failed' },
      { id: '6', file: new File([], 'f.pdf'), fileName: 'f.pdf', status: 'skipped', result: null },
    ]

    const stats = getBatchStats(items)

    expect(stats.total).toBe(6)
    expect(stats.pending).toBe(1)
    expect(stats.processing).toBe(1)
    expect(stats.success).toBe(2)
    expect(stats.error).toBe(1)
    expect(stats.skipped).toBe(1)
  })

  it('should calculate correct completion percentage', () => {
    const items: BatchPDFItem[] = [
      { id: '1', file: new File([], 'a.pdf'), fileName: 'a.pdf', status: 'success', result: null },
      { id: '2', file: new File([], 'b.pdf'), fileName: 'b.pdf', status: 'success', result: null },
      { id: '3', file: new File([], 'c.pdf'), fileName: 'c.pdf', status: 'pending', result: null },
      { id: '4', file: new File([], 'd.pdf'), fileName: 'd.pdf', status: 'pending', result: null },
    ]

    const stats = getBatchStats(items)

    expect(stats.completedPercent).toBe(50) // 2 success out of 4 total
  })

  it('should include error and skipped in completion percentage', () => {
    const items: BatchPDFItem[] = [
      { id: '1', file: new File([], 'a.pdf'), fileName: 'a.pdf', status: 'success', result: null },
      { id: '2', file: new File([], 'b.pdf'), fileName: 'b.pdf', status: 'error', result: null },
      { id: '3', file: new File([], 'c.pdf'), fileName: 'c.pdf', status: 'skipped', result: null },
      { id: '4', file: new File([], 'd.pdf'), fileName: 'd.pdf', status: 'pending', result: null },
    ]

    const stats = getBatchStats(items)

    expect(stats.completedPercent).toBe(75) // 3 completed (success + error + skipped) out of 4
  })

  it('should handle empty items array', () => {
    const stats = getBatchStats([])

    expect(stats.total).toBe(0)
    expect(stats.completedPercent).toBe(0)
  })

  it('should return 100% when all items are completed', () => {
    const items: BatchPDFItem[] = [
      { id: '1', file: new File([], 'a.pdf'), fileName: 'a.pdf', status: 'success', result: null },
      { id: '2', file: new File([], 'b.pdf'), fileName: 'b.pdf', status: 'success', result: null },
    ]

    const stats = getBatchStats(items)

    expect(stats.completedPercent).toBe(100)
  })
})
