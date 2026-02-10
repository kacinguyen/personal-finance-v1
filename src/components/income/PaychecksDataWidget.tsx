import { motion } from 'framer-motion'
import {
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload,
} from 'lucide-react'
import { processPaystubPDF, type ImportResult } from '../../lib/paystubImport'
import { isPDFFile } from '../../lib/pdfExtractor'

type Props = {
  paystubCount: number
  loadingPaystubs: boolean
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
  /** Ref to attach to the hidden file input; caller must provide it for external trigger */
  fileInputRef: React.RefObject<HTMLInputElement>
}

export function PaychecksDataWidget({
  paystubCount,
  loadingPaystubs,
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

    // Reset the input so the same file can be selected again
    e.target.value = ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.4 }}
      className="bg-white rounded-xl p-5 shadow-sm"
      style={{ boxShadow: '0 2px 8px rgba(31, 20, 16, 0.04)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#1F1410]/70">Paychecks</h3>
        <button
          onClick={onUploadClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#10B981] hover:bg-[#10B981]/5 transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Paycheck</span>
        </button>
      </div>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.95 }}
        className="flex items-center gap-3 p-2 rounded-lg"
      >
        <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-[#10B981]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[#1F1410]">
            {loadingPaystubs ? '...' : paystubCount} {paystubCount === 1 ? 'paycheck' : 'paychecks'}
          </p>
          <p className="text-xs text-[#1F1410]/40">Uploaded salary documents</p>
        </div>
      </motion.div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* PDF Processing Status */}
      {isProcessingPDF && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-blue-50 text-blue-700"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Processing "{currentFileName}"...</span>
        </motion.div>
      )}

      {/* Error Message */}
      {importError && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-red-50 text-red-700"
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

      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 flex items-center gap-3 p-3 rounded-lg bg-green-50 text-green-700"
        >
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{successMessage}</span>
        </motion.div>
      )}
    </motion.div>
  )
}
