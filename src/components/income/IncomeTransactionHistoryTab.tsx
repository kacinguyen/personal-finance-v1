import { motion } from 'framer-motion'
import {
  Briefcase,
  CheckCircle,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle as CheckCircleSuccess,
} from 'lucide-react'
import { formatMonth } from '../../lib/dateUtils'
import { processPaystubPDF, type ImportResult } from '../../lib/paystubImport'
import { isPDFFile } from '../../lib/pdfExtractor'
import { OtherIncomeSection, type OtherIncomeCategory } from './OtherIncomeSection'
import type { Transaction } from '../../types/transaction'
import type { PaystubRecord } from '../views/IncomeView'

type Props = {
  selectedMonth: Date
  salaryTransactions: Transaction[]
  otherIncome: { categories: OtherIncomeCategory[]; total: number }
  loading: boolean
  paystubs: PaystubRecord[]
  // Upload state
  isProcessingPDF: boolean
  currentFileName: string
  importError: string | null
  successMessage: string | null
  onProcessingStart: () => void
  onProcessingEnd: () => void
  onFileNameChange: (name: string) => void
  onPdfFileChange: (file: File | null) => void
  onImportResult: (result: ImportResult) => void
  onImportError: (error: string | null) => void
  onUploadClick: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
}

/**
 * Check if a paystub exists within ±3 days of a transaction date
 */
function findMatchingPaystub(
  txDate: string,
  paystubs: PaystubRecord[]
): PaystubRecord | undefined {
  const txTime = new Date(txDate + 'T00:00:00').getTime()
  const THREE_DAYS = 3 * 24 * 60 * 60 * 1000

  return paystubs.find((p) => {
    const payTime = new Date(p.pay_date + 'T00:00:00').getTime()
    return Math.abs(payTime - txTime) <= THREE_DAYS
  })
}

export function IncomeTransactionHistoryTab({
  selectedMonth,
  salaryTransactions,
  otherIncome,
  loading,
  paystubs,
  isProcessingPDF,
  currentFileName,
  importError,
  successMessage,
  onProcessingStart,
  onProcessingEnd,
  onFileNameChange,
  onPdfFileChange,
  onImportResult,
  onImportError,
  onUploadClick,
  fileInputRef,
}: Props) {

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    const pdfFiles = files.filter(isPDFFile)

    if (pdfFiles.length > 0) {
      const pdfFile = pdfFiles[0]
      onFileNameChange(pdfFile.name)
      onPdfFileChange(pdfFile)
      onProcessingStart()
      onImportError(null)

      try {
        const result = await processPaystubPDF(pdfFile)

        if (result.success && result.parsedData && result.validation) {
          onImportResult(result)
        } else {
          onImportError(result.error || 'Failed to process PDF')
        }
      } catch (err) {
        onImportError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        onProcessingEnd()
      }
    }

    e.target.value = ''
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload status strip */}
      {isProcessingPDF && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-700"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Processing &ldquo;{currentFileName}&rdquo;...</span>
        </motion.div>
      )}

      {importError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-red-50 text-red-700"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{importError}</span>
          <button
            onClick={() => onImportError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            &times;
          </button>
        </motion.div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-700"
        >
          <CheckCircleSuccess className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{successMessage}</span>
        </motion.div>
      )}

      {/* Salary Transactions */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-[#10B981]" />
          </div>
          <h3 className="text-sm font-bold text-[#1F1410]">Salary</h3>
          <span className="text-xs text-[#1F1410]/40">
            {salaryTransactions.length} in {formatMonth(selectedMonth)}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-[#10B981] animate-spin" />
          </div>
        ) : salaryTransactions.length === 0 ? (
          <p className="text-sm text-[#1F1410]/40 py-4 text-center">
            No salary transactions for this month
          </p>
        ) : (
          <div className="space-y-1">
            {salaryTransactions.map((tx) => {
              const txDate = new Date(tx.date + 'T00:00:00').toLocaleDateString(
                'en-US',
                { month: 'short', day: 'numeric' }
              )
              const matchedPaystub = findMatchingPaystub(tx.date, paystubs)

              return (
                <div key={tx.id} className="py-2 border-b border-[#1F1410]/5 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-[#1F1410]">
                        {tx.merchant || 'Salary'}
                      </span>
                      <span className="ml-2 text-xs text-[#1F1410]/40">{txDate}</span>
                    </div>
                    <span className="text-sm font-bold text-[#1F1410]">
                      ${Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1">
                    {matchedPaystub ? (
                      <div className="flex items-center gap-1.5 text-xs text-[#10B981]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{matchedPaystub.source_file_name || 'Paystub uploaded'}</span>
                      </div>
                    ) : (
                      <button
                        onClick={onUploadClick}
                        className="flex items-center gap-1.5 text-xs text-[#1F1410]/30 hover:text-[#10B981] transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload paycheck stub</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Other Income */}
      <OtherIncomeSection
        categories={otherIncome.categories}
        total={otherIncome.total}
        loading={loading}
      />
    </div>
  )
}
