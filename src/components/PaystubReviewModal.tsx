import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  DollarSign,
  Calendar,
  Loader2,
  FileText,
  Building2,
  Edit3,
  Check,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import type { ParsedPaystub, ParsedField } from '../lib/adpPaystubParser'
import type { ValidationResult } from '../lib/paystubImport'
import { parsedToInsert, savePaystub } from '../lib/paystubImport'
import { PDFPreview } from './PDFPreview'
import { useUser } from '../hooks/useUser'

interface PaystubReviewModalProps {
  isOpen: boolean
  onClose: () => void
  parsedData: ParsedPaystub
  validation: ValidationResult
  fileName: string
  pdfFile: File | null
  onSaveSuccess: (netPay?: number) => void
}

interface EditableField {
  key: string
  label: string
  value: number | string | null
  type: 'currency' | 'date' | 'text'
  confidence?: 'high' | 'medium' | 'low'
}

type FieldCategory = {
  title: string
  fields: EditableField[]
}

export function PaystubReviewModal({
  isOpen,
  onClose,
  parsedData,
  validation: _validation,
  fileName,
  pdfFile,
  onSaveSuccess,
}: PaystubReviewModalProps) {
  // _validation available for future use (e.g., showing field warnings)
  const { userId } = useUser()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)

  // Initialize editable values from parsed data
  const [editableValues, setEditableValues] = useState<Record<string, number | string | null>>(
    () => {
      const getValue = <T,>(field: ParsedField<T> | null): T | null =>
        field?.value ?? null

      return {
        pay_date: getValue(parsedData.payDate) || '',
        pay_period_start: getValue(parsedData.payPeriodStart) || '',
        pay_period_end: getValue(parsedData.payPeriodEnd) || '',
        employer_name: getValue(parsedData.employerName) || '',

        gross_pay: getValue(parsedData.grossPay) || 0,
        regular_pay: getValue(parsedData.regularPay),
        overtime_pay: getValue(parsedData.overtimePay),
        bonus_pay: getValue(parsedData.bonusPay),
        commission: getValue(parsedData.commission),
        pto_payout: getValue(parsedData.ptoPayout),
        other_earnings: getValue(parsedData.otherEarnings),

        traditional_401k: getValue(parsedData.traditional401k),
        health_insurance: getValue(parsedData.healthInsurance),
        dental_insurance: getValue(parsedData.dentalInsurance),
        vision_insurance: getValue(parsedData.visionInsurance),
        hsa_contribution: getValue(parsedData.hsaContribution),
        fsa_contribution: getValue(parsedData.fsaContribution),
        espp_contribution: getValue(parsedData.esppContribution),
        life_insurance: getValue(parsedData.lifeInsurance),
        other_pretax: getValue(parsedData.otherPretax),

        federal_income_tax: getValue(parsedData.federalIncomeTax),
        state_income_tax: getValue(parsedData.stateIncomeTax),
        social_security_tax: getValue(parsedData.socialSecurityTax),
        medicare_tax: getValue(parsedData.medicareTax),
        local_tax: getValue(parsedData.localTax),
        state_disability_insurance: getValue(parsedData.stateDisabilityInsurance),
        other_taxes: getValue(parsedData.otherTaxes),

        roth_401k: getValue(parsedData.roth401k),
        after_tax_401k: getValue(parsedData.afterTax401k),
        other_posttax: getValue(parsedData.otherPosttax),

        net_pay: getValue(parsedData.netPay) || 0,
      }
    }
  )

  const getConfidence = (
    field: ParsedField<unknown> | null | undefined
  ): 'high' | 'medium' | 'low' | undefined => field?.confidence

  const fieldCategories: FieldCategory[] = [
    {
      title: 'Pay Period',
      fields: [
        { key: 'pay_date', label: 'Pay Date', value: editableValues.pay_date, type: 'date', confidence: getConfidence(parsedData.payDate) },
        { key: 'pay_period_start', label: 'Period Start', value: editableValues.pay_period_start, type: 'date', confidence: getConfidence(parsedData.payPeriodStart) },
        { key: 'pay_period_end', label: 'Period End', value: editableValues.pay_period_end, type: 'date', confidence: getConfidence(parsedData.payPeriodEnd) },
        { key: 'employer_name', label: 'Employer', value: editableValues.employer_name, type: 'text', confidence: getConfidence(parsedData.employerName) },
      ],
    },
    {
      title: 'Earnings',
      fields: [
        { key: 'gross_pay', label: 'Gross Pay', value: editableValues.gross_pay, type: 'currency', confidence: getConfidence(parsedData.grossPay) },
        { key: 'regular_pay', label: 'Regular Pay', value: editableValues.regular_pay, type: 'currency', confidence: getConfidence(parsedData.regularPay) },
        { key: 'overtime_pay', label: 'Overtime', value: editableValues.overtime_pay, type: 'currency', confidence: getConfidence(parsedData.overtimePay) },
        { key: 'bonus_pay', label: 'Bonus', value: editableValues.bonus_pay, type: 'currency', confidence: getConfidence(parsedData.bonusPay) },
        { key: 'commission', label: 'Commission', value: editableValues.commission, type: 'currency', confidence: getConfidence(parsedData.commission) },
        { key: 'pto_payout', label: 'PTO Payout', value: editableValues.pto_payout, type: 'currency', confidence: getConfidence(parsedData.ptoPayout) },
      ],
    },
    {
      title: 'Taxes',
      fields: [
        { key: 'federal_income_tax', label: 'Federal Tax', value: editableValues.federal_income_tax, type: 'currency', confidence: getConfidence(parsedData.federalIncomeTax) },
        { key: 'state_income_tax', label: 'State Tax', value: editableValues.state_income_tax, type: 'currency', confidence: getConfidence(parsedData.stateIncomeTax) },
        { key: 'social_security_tax', label: 'Social Security', value: editableValues.social_security_tax, type: 'currency', confidence: getConfidence(parsedData.socialSecurityTax) },
        { key: 'medicare_tax', label: 'Medicare', value: editableValues.medicare_tax, type: 'currency', confidence: getConfidence(parsedData.medicareTax) },
        { key: 'local_tax', label: 'Local Tax', value: editableValues.local_tax, type: 'currency', confidence: getConfidence(parsedData.localTax) },
        { key: 'state_disability_insurance', label: 'SDI', value: editableValues.state_disability_insurance, type: 'currency', confidence: getConfidence(parsedData.stateDisabilityInsurance) },
      ],
    },
    {
      title: 'Pre-Tax Deductions',
      fields: [
        { key: 'traditional_401k', label: '401(k)', value: editableValues.traditional_401k, type: 'currency', confidence: getConfidence(parsedData.traditional401k) },
        { key: 'health_insurance', label: 'Health Insurance', value: editableValues.health_insurance, type: 'currency', confidence: getConfidence(parsedData.healthInsurance) },
        { key: 'dental_insurance', label: 'Dental', value: editableValues.dental_insurance, type: 'currency', confidence: getConfidence(parsedData.dentalInsurance) },
        { key: 'vision_insurance', label: 'Vision', value: editableValues.vision_insurance, type: 'currency', confidence: getConfidence(parsedData.visionInsurance) },
        { key: 'hsa_contribution', label: 'HSA', value: editableValues.hsa_contribution, type: 'currency', confidence: getConfidence(parsedData.hsaContribution) },
        { key: 'fsa_contribution', label: 'FSA', value: editableValues.fsa_contribution, type: 'currency', confidence: getConfidence(parsedData.fsaContribution) },
        { key: 'espp_contribution', label: 'ESPP', value: editableValues.espp_contribution, type: 'currency', confidence: getConfidence(parsedData.esppContribution) },
        { key: 'life_insurance', label: 'Life Insurance', value: editableValues.life_insurance, type: 'currency', confidence: getConfidence(parsedData.lifeInsurance) },
      ],
    },
    {
      title: 'Post-Tax Deductions',
      fields: [
        { key: 'roth_401k', label: 'Roth 401(k)', value: editableValues.roth_401k, type: 'currency', confidence: getConfidence(parsedData.roth401k) },
        { key: 'after_tax_401k', label: 'After-Tax 401(k)', value: editableValues.after_tax_401k, type: 'currency', confidence: getConfidence(parsedData.afterTax401k) },
      ],
    },
    {
      title: 'Net Pay',
      fields: [
        { key: 'net_pay', label: 'Net Pay', value: editableValues.net_pay, type: 'currency', confidence: getConfidence(parsedData.netPay) },
      ],
    },
  ]

  const handleValueChange = (key: string, value: string) => {
    setEditableValues((prev) => ({
      ...prev,
      [key]: value === '' ? null : value,
    }))
  }

  const handleSave = async () => {
    if (!userId) {
      setError('You must be logged in to save paychecks')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Build the insert object from editable values
      const insertData = parsedToInsert(parsedData, fileName)

      // Override with any user edits
      const dateFields = ['pay_date', 'pay_period_start', 'pay_period_end']
      Object.entries(editableValues).forEach(([key, value]) => {
        if (key in insertData) {
          if (value === '' || value === null) {
            (insertData as Record<string, unknown>)[key] = null
          } else if (dateFields.includes(key)) {
            // Keep date fields as strings (don't convert to number)
            (insertData as Record<string, unknown>)[key] = value
          } else if (typeof value === 'string' && !isNaN(parseFloat(value))) {
            (insertData as Record<string, unknown>)[key] = parseFloat(value)
          } else {
            (insertData as Record<string, unknown>)[key] = value
          }
        }
      })

      const result = await savePaystub(insertData, userId)

      if (!result.success) {
        setError(result.error || 'Failed to save paycheck')
        return
      }

      // Pass net pay to parent for income source addition
      const netPay = typeof editableValues.net_pay === 'number'
        ? editableValues.net_pay
        : parseFloat(String(editableValues.net_pay)) || 0
      onSaveSuccess(netPay)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low' | undefined): string => {
    switch (confidence) {
      case 'high':
        return '#10B981'
      case 'medium':
        return '#F59E0B'
      case 'low':
        return '#FF6B6B'
      default:
        return '#9CA3AF'
    }
  }

  const getConfidenceLabel = (confidence: 'high' | 'medium' | 'low' | undefined): string => {
    switch (confidence) {
      case 'high':
        return 'High confidence'
      case 'medium':
        return 'Review suggested'
      case 'low':
        return 'Needs verification'
      default:
        return ''
    }
  }

  const getFieldIcon = (type: 'currency' | 'date' | 'text') => {
    switch (type) {
      case 'currency':
        return DollarSign
      case 'date':
        return Calendar
      case 'text':
        return Building2
    }
  }

  // Count high confidence fields
  const highConfidenceCount = fieldCategories
    .flatMap((cat) => cat.fields)
    .filter((f) => f.confidence === 'high').length
  const totalFieldCount = fieldCategories.flatMap((cat) => cat.fields).length

  // Flatten all fields for the card view
  const allFields = fieldCategories.flatMap((cat) => cat.fields)

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1410]/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1410]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F1410]">Review Extracted Data</h2>
                <p className="text-sm text-[#1F1410]/50">{fileName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
            >
              <X className="w-5 h-5 text-[#1F1410]/60" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Document Preview */}
              <div>
                <h3 className="text-sm font-semibold text-[#1F1410]/70 mb-3">Document Preview</h3>
                <PDFPreview file={pdfFile} fileName={fileName} />
              </div>

              {/* Extracted Fields */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#1F1410]/70">Extracted Fields</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#1F1410]/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>{highConfidenceCount} of {totalFieldCount} verified</span>
                  </div>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {allFields.map((field, index) => {
                    const Icon = getFieldIcon(field.type)
                    const isEditing = editingField === field.key
                    const confidenceColor = getConfidenceColor(field.confidence)

                    return (
                      <motion.div
                        key={field.key}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isEditing
                            ? 'border-[#10B981] bg-[#10B981]/5'
                            : field.confidence === 'low'
                            ? 'border-[#FF6B6B]/30 bg-[#FF6B6B]/5'
                            : 'border-[#1F1410]/10 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: `${confidenceColor}15` }}
                            >
                              <Icon className="w-4 h-4" style={{ color: confidenceColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-[#1F1410]/50">
                                  {field.label}
                                </span>
                                {field.confidence && (
                                  <span
                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                    style={{
                                      backgroundColor: `${confidenceColor}15`,
                                      color: confidenceColor,
                                    }}
                                  >
                                    {getConfidenceLabel(field.confidence)}
                                  </span>
                                )}
                              </div>
                              {isEditing ? (
                                <input
                                  type={field.type === 'currency' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                  step={field.type === 'currency' ? '0.01' : undefined}
                                  value={editableValues[field.key] ?? ''}
                                  onChange={(e) => handleValueChange(field.key, e.target.value)}
                                  onBlur={() => setEditingField(null)}
                                  onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                                  autoFocus
                                  className="w-full text-lg font-bold text-[#1F1410] bg-transparent border-none outline-none"
                                />
                              ) : (
                                <p className="text-lg font-bold text-[#1F1410]">
                                  {field.type === 'currency' && '$'}
                                  {editableValues[field.key] ?? '-'}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingField(isEditing ? null : field.key)}
                            className={`p-2 rounded-lg transition-colors ${
                              isEditing
                                ? 'bg-[#10B981] text-white'
                                : 'hover:bg-[#1F1410]/5 text-[#1F1410]/40'
                            }`}
                          >
                            {isEditing ? (
                              <Check className="w-4 h-4" />
                            ) : (
                              <Edit3 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between px-6 py-4 border-t border-[#1F1410]/10 bg-[#1F1410]/[0.02]"
          >
            <div className="flex items-center gap-2 text-sm text-[#1F1410]/50">
              <AlertCircle className="w-4 h-4" />
              <span>Please verify all fields before confirming</span>
            </div>
            <div className="flex items-center gap-3">
              {error && (
                <span className="text-sm text-[#FF6B6B]">{error}</span>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#10B981] hover:bg-[#10B981]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isSaving ? 'Saving...' : 'Confirm & apply'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
