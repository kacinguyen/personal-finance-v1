import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Loader2,
  FileText,
  Check,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  SkipForward,
  RefreshCw,
  DollarSign,
  Calendar,
  Building2,
  Edit3,
} from 'lucide-react'
import type { BatchPDFItem, BatchProcessUpdate, BatchSaveResult } from '../types/batchImport'
import type { PaystubInsert } from '../types/paystub'
import type { ParsedPaystub, ParsedField } from '../lib/adpPaystubParser'
import {
  processBatchPDFs,
  saveBatchPaystubs,
  getBatchStats,
} from '../lib/batchPaystubImport'
import { parsedToInsert, processPaystubPDF } from '../lib/paystubImport'
import { useUser } from '../hooks/useUser'

interface BatchPaystubReviewModalProps {
  isOpen: boolean
  onClose: () => void
  items: BatchPDFItem[]
  onSaveSuccess: (savedCount: number) => void
}

interface EditableValues {
  [key: string]: Record<string, number | string | null>
}

export function BatchPaystubReviewModal({
  isOpen,
  onClose,
  items: initialItems,
  onSaveSuccess,
}: BatchPaystubReviewModalProps) {
  const { userId } = useUser()
  const [items, setItems] = useState<BatchPDFItem[]>(initialItems)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)
  const [editableValues, setEditableValues] = useState<EditableValues>({})
  const [editingField, setEditingField] = useState<{ itemId: string; field: string } | null>(null)
  const [saveResults, setSaveResults] = useState<BatchSaveResult[]>([])
  const [savingComplete, setSavingComplete] = useState(false)

  const stats = getBatchStats(items)

  // Start processing when modal opens
  useEffect(() => {
    if (isOpen && stats.pending > 0 && !isProcessing) {
      startProcessing()
    }
  }, [isOpen])

  const startProcessing = async () => {
    setIsProcessing(true)

    const handleUpdate = (update: BatchProcessUpdate) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id !== update.itemId) return item
          return {
            ...item,
            status: update.status,
            result: update.result ?? item.result,
            error: update.error,
          }
        })
      )

      // Initialize editable values for successful items
      if (update.status === 'success' && update.result?.parsedData) {
        initEditableValues(update.itemId, update.result.parsedData)
      }
    }

    await processBatchPDFs(items, 3, handleUpdate)
    setIsProcessing(false)
  }

  const initEditableValues = (itemId: string, parsedData: ParsedPaystub) => {
    const getValue = <T,>(field: ParsedField<T> | null): T | null =>
      field?.value ?? null

    setEditableValues((prev) => ({
      ...prev,
      [itemId]: {
        pay_date: getValue(parsedData.payDate) || '',
        pay_period_start: getValue(parsedData.payPeriodStart) || '',
        pay_period_end: getValue(parsedData.payPeriodEnd) || '',
        employer_name: getValue(parsedData.employerName) || '',
        gross_pay: getValue(parsedData.grossPay) || 0,
        net_pay: getValue(parsedData.netPay) || 0,
        traditional_401k: getValue(parsedData.traditional401k),
        health_insurance: getValue(parsedData.healthInsurance),
        federal_income_tax: getValue(parsedData.federalIncomeTax),
        state_income_tax: getValue(parsedData.stateIncomeTax),
        espp_contribution: getValue(parsedData.esppContribution),
        hsa_contribution: getValue(parsedData.hsaContribution),
      },
    }))
  }

  const handleValueChange = (itemId: string, key: string, value: string) => {
    setEditableValues((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [key]: value === '' ? null : value,
      },
    }))
  }

  const handleSkipItem = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: 'skipped' } : item
      )
    )
  }

  const handleRetryItem = async (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    setItems((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, status: 'processing', error: undefined } : i
      )
    )

    try {
      const result = await processPaystubPDF(item.file)
      setItems((prev) =>
        prev.map((i) => {
          if (i.id !== itemId) return i
          if (result.success) {
            if (result.parsedData) {
              initEditableValues(itemId, result.parsedData)
            }
            return { ...i, status: 'success', result, error: undefined }
          }
          return { ...i, status: 'error', result: null, error: result.error }
        })
      )
    } catch (err) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === itemId
            ? { ...i, status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
            : i
        )
      )
    }
  }

  const handleSaveAll = async () => {
    if (!userId) return

    setIsSaving(true)
    setSaveResults([])

    // Prepare items with edited data
    const itemsWithEdits = items.map((item) => {
      if (item.status !== 'success' || !item.result?.parsedData) return item

      const values = editableValues[item.id]
      if (!values) return item

      const insertData = parsedToInsert(item.result.parsedData, item.fileName)

      // Apply edits
      const dateFields = ['pay_date', 'pay_period_start', 'pay_period_end']
      Object.entries(values).forEach(([key, value]) => {
        if (key in insertData) {
          if (value === '' || value === null) {
            (insertData as Record<string, unknown>)[key] = null
          } else if (dateFields.includes(key)) {
            (insertData as Record<string, unknown>)[key] = value
          } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
            (insertData as Record<string, unknown>)[key] = parseFloat(value)
          } else {
            (insertData as Record<string, unknown>)[key] = value
          }
        }
      })

      return { ...item, editedData: insertData as PaystubInsert }
    })

    const results = await saveBatchPaystubs(itemsWithEdits, userId, (result) => {
      setSaveResults((prev) => [...prev, result])
    })

    setIsSaving(false)
    setSavingComplete(true)

    const savedCount = results.filter((r) => r.success).length
    if (savedCount > 0) {
      onSaveSuccess(savedCount)
    }
  }

  const handleClose = () => {
    if (!isProcessing && !isSaving) {
      onClose()
    }
  }

  const getStatusIcon = (status: BatchPDFItem['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full border-2 border-[#1F1410]/20" />
      case 'processing':
        return <Loader2 className="w-5 h-5 text-[#6366F1] animate-spin" />
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[#FF6B6B]" />
      case 'skipped':
        return <SkipForward className="w-5 h-5 text-[#1F1410]/40" />
    }
  }

  const successItems = items.filter((i) => i.status === 'success')
  const canSave = successItems.length > 0 && !isProcessing && !isSaving && !savingComplete

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1410]/40 backdrop-blur-sm"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1410]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F1410]">Batch Import</h2>
                <p className="text-sm text-[#1F1410]/50">
                  {items.length} paystubs to process
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isProcessing || isSaving}
              className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-[#1F1410]/60" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-3 border-b border-[#1F1410]/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#1F1410]/60">
                {isProcessing ? 'Processing...' : savingComplete ? 'Import Complete' : 'Ready to review'}
              </span>
              <span className="text-sm font-medium text-[#1F1410]">
                {stats.success + stats.error + stats.skipped} / {stats.total}
              </span>
            </div>
            <div className="h-2 bg-[#1F1410]/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.completedPercent}%` }}
                className="h-full bg-[#10B981] rounded-full"
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-[#1F1410]/50">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                {stats.success} processed
              </span>
              {stats.error > 0 && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#FF6B6B]" />
                  {stats.error} failed
                </span>
              )}
              {stats.skipped > 0 && (
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
                  {stats.skipped} skipped
                </span>
              )}
            </div>
          </div>

          {/* Items List */}
          <div className="p-4 overflow-y-auto max-h-[calc(90vh-280px)]">
            <div className="space-y-2">
              {items.map((item) => {
                const isExpanded = expandedItemId === item.id
                const values = editableValues[item.id] || {}
                const saveResult = saveResults.find((r) => r.itemId === item.id)

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border-2 transition-colors ${
                      item.status === 'error'
                        ? 'border-[#FF6B6B]/30 bg-[#FF6B6B]/5'
                        : item.status === 'success'
                        ? 'border-[#10B981]/20 bg-[#10B981]/5'
                        : 'border-[#1F1410]/10 bg-white'
                    }`}
                  >
                    {/* Item Header */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer"
                      onClick={() =>
                        item.status === 'success' &&
                        setExpandedItemId(isExpanded ? null : item.id)
                      }
                    >
                      {getStatusIcon(item.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1F1410] truncate">
                          {item.fileName}
                        </p>
                        {item.status === 'success' && values.pay_date && (
                          <p className="text-xs text-[#1F1410]/50">
                            Pay Date: {values.pay_date} | Net: $
                            {Number(values.net_pay || 0).toLocaleString()}
                          </p>
                        )}
                        {item.status === 'error' && (
                          <p className="text-xs text-[#FF6B6B]">{item.error}</p>
                        )}
                        {saveResult && (
                          <p
                            className={`text-xs ${
                              saveResult.success ? 'text-[#10B981]' : 'text-[#FF6B6B]'
                            }`}
                          >
                            {saveResult.success
                              ? `Saved${saveResult.autoContributions ? ` (${saveResult.autoContributions} auto-contributions)` : ''}`
                              : saveResult.error}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status === 'error' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRetryItem(item.id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-[#1F1410]/5 text-[#1F1410]/50 hover:text-[#6366F1] transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {item.status === 'success' && !savingComplete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSkipItem(item.id)
                            }}
                            className="p-1.5 rounded-lg hover:bg-[#1F1410]/5 text-[#1F1410]/50 hover:text-[#FF6B6B] transition-colors"
                            title="Skip this paystub"
                          >
                            <SkipForward className="w-4 h-4" />
                          </button>
                        )}
                        {item.status === 'success' && (
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4 text-[#1F1410]/40" />
                          </motion.div>
                        )}
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && item.status === 'success' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-2 border-t border-[#1F1410]/5">
                            <div className="grid grid-cols-2 gap-3">
                              {/* Pay Date */}
                              <EditableField
                                itemId={item.id}
                                fieldKey="pay_date"
                                label="Pay Date"
                                value={values.pay_date}
                                type="date"
                                icon={Calendar}
                                editingField={editingField}
                                onEdit={setEditingField}
                                onChange={handleValueChange}
                                disabled={savingComplete}
                              />
                              {/* Employer */}
                              <EditableField
                                itemId={item.id}
                                fieldKey="employer_name"
                                label="Employer"
                                value={values.employer_name}
                                type="text"
                                icon={Building2}
                                editingField={editingField}
                                onEdit={setEditingField}
                                onChange={handleValueChange}
                                disabled={savingComplete}
                              />
                              {/* Gross Pay */}
                              <EditableField
                                itemId={item.id}
                                fieldKey="gross_pay"
                                label="Gross Pay"
                                value={values.gross_pay}
                                type="currency"
                                icon={DollarSign}
                                editingField={editingField}
                                onEdit={setEditingField}
                                onChange={handleValueChange}
                                disabled={savingComplete}
                              />
                              {/* Net Pay */}
                              <EditableField
                                itemId={item.id}
                                fieldKey="net_pay"
                                label="Net Pay"
                                value={values.net_pay}
                                type="currency"
                                icon={DollarSign}
                                editingField={editingField}
                                onEdit={setEditingField}
                                onChange={handleValueChange}
                                disabled={savingComplete}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#1F1410]/10 bg-[#1F1410]/[0.02]">
            <div className="text-sm text-[#1F1410]/50">
              {savingComplete ? (
                <span className="text-[#10B981]">
                  {saveResults.filter((r) => r.success).length} paystubs saved
                </span>
              ) : (
                <span>
                  {successItems.length} paystub{successItems.length !== 1 ? 's' : ''} ready to save
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                disabled={isProcessing || isSaving}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors disabled:opacity-50"
              >
                {savingComplete ? 'Close' : 'Cancel'}
              </button>
              {!savingComplete && (
                <button
                  onClick={handleSaveAll}
                  disabled={!canSave}
                  className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#10B981] hover:bg-[#10B981]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isSaving ? 'Saving...' : `Save All (${successItems.length})`}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Editable field component for inline editing
function EditableField({
  itemId,
  fieldKey,
  label,
  value,
  type,
  icon: Icon,
  editingField,
  onEdit,
  onChange,
  disabled,
}: {
  itemId: string
  fieldKey: string
  label: string
  value: number | string | null | undefined
  type: 'currency' | 'date' | 'text'
  icon: typeof DollarSign
  editingField: { itemId: string; field: string } | null
  onEdit: (field: { itemId: string; field: string } | null) => void
  onChange: (itemId: string, key: string, value: string) => void
  disabled?: boolean
}) {
  const isEditing = editingField?.itemId === itemId && editingField?.field === fieldKey

  return (
    <div
      className={`p-2 rounded-lg border transition-all ${
        isEditing ? 'border-[#10B981] bg-[#10B981]/5' : 'border-transparent bg-[#1F1410]/[0.03]'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-[#1F1410]/40" />
        <span className="text-[10px] font-medium text-[#1F1410]/50">{label}</span>
      </div>
      <div className="flex items-center justify-between mt-1">
        {isEditing ? (
          <input
            type={type === 'currency' ? 'number' : type === 'date' ? 'date' : 'text'}
            step={type === 'currency' ? '0.01' : undefined}
            value={value ?? ''}
            onChange={(e) => onChange(itemId, fieldKey, e.target.value)}
            onBlur={() => onEdit(null)}
            onKeyDown={(e) => e.key === 'Enter' && onEdit(null)}
            autoFocus
            className="flex-1 text-sm font-semibold text-[#1F1410] bg-transparent border-none outline-none"
          />
        ) : (
          <p className="text-sm font-semibold text-[#1F1410]">
            {type === 'currency' && '$'}
            {value ?? '-'}
          </p>
        )}
        {!disabled && (
          <button
            onClick={() => onEdit(isEditing ? null : { itemId, field: fieldKey })}
            className={`p-1 rounded transition-colors ${
              isEditing
                ? 'bg-[#10B981] text-white'
                : 'hover:bg-[#1F1410]/5 text-[#1F1410]/30'
            }`}
          >
            {isEditing ? <Check className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
          </button>
        )}
      </div>
    </div>
  )
}
