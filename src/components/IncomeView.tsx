import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  FileText,
  Building2,
  TrendingDown,
  DollarSign,
  Plus,
  Briefcase,
  Wallet,
  LucideIcon,
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload,
} from 'lucide-react'
import { processPaystubPDF, type ImportResult } from '../lib/paystubImport'
import { isPDFFile } from '../lib/pdfExtractor'
import { PaystubReviewModal } from './PaystubReviewModal'

type IncomeSource = {
  name: string
  amount: number
  icon: LucideIcon
  color: string
}

type ConnectedBank = {
  name: string
  lastSync: string
  accountType: string
}

export function IncomeView() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PDF import state
  const [isProcessingPDF, setIsProcessingPDF] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [currentFileName, setCurrentFileName] = useState<string>('')
  const [currentPdfFile, setCurrentPdfFile] = useState<File | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const connectedBanks: ConnectedBank[] = [
    { name: 'Chase Checking', lastSync: '2 hours ago', accountType: 'Checking' },
    { name: 'Wells Fargo Savings', lastSync: '1 day ago', accountType: 'Savings' },
  ]

  const uploadedDocuments = uploadedFiles.length || 3 // Default to 3 for demo purposes

  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([
    { name: 'Salary', amount: 3000, icon: Briefcase, color: '#10B981' },
    { name: 'Freelance', amount: 800, icon: Wallet, color: '#38BDF8' },
    { name: 'Investments', amount: 250, icon: TrendingUp, color: '#A855F7' },
  ])

  const totalExpectedIncome = incomeSources.reduce((sum, source) => sum + source.amount, 0)
  const previousMonthIncome = 3500
  const incomeChange = totalExpectedIncome - previousMonthIncome
  const incomeChangePercentage = (incomeChange / previousMonthIncome) * 100

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)
    setUploadedFiles((prev) => [...prev, ...files])

    // Check for PDF files to process
    const pdfFiles = files.filter(isPDFFile)

    if (pdfFiles.length > 0) {
      // Process the first PDF (batch import is out of scope for now)
      const pdfFile = pdfFiles[0]
      setCurrentFileName(pdfFile.name)
      setCurrentPdfFile(pdfFile)
      setIsProcessingPDF(true)
      setImportError(null)
      setSuccessMessage(null)

      try {
        const result = await processPaystubPDF(pdfFile)

        if (result.success && result.parsedData && result.validation) {
          setImportResult(result)
          setShowReviewModal(true)
        } else {
          setImportError(result.error || 'Failed to process PDF')
        }
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsProcessingPDF(false)
      }
    }

    // Reset the input so the same file can be selected again
    e.target.value = ''
  }

  const handleReviewModalClose = () => {
    setShowReviewModal(false)
    setImportResult(null)
    setCurrentPdfFile(null)
  }

  const handleSaveSuccess = (netPay?: number) => {
    setSuccessMessage(`Paystub from "${currentFileName}" saved successfully!`)
    // Clear the success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000)

    // Add as income source if net pay is provided
    if (netPay && netPay > 0) {
      setIncomeSources((prev) => [
        ...prev,
        {
          name: 'Pay Slip Income',
          amount: netPay,
          icon: Briefcase,
          color: '#6366F1',
        },
      ])
    }
  }

  const handleBankIntegration = () => {
    console.log('Connect bank account')
  }

  const handleUploadDocument = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-12 h-12 rounded-xl bg-[#10B981]/10 flex items-center justify-center"
            >
              <TrendingUp className="w-6 h-6 text-[#10B981]" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410]">Income</h1>
          </div>
          <p className="text-[#1F1410]/60 text-lg">Track your earnings and revenue streams</p>
        </motion.div>

        {/* Expected Income Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white rounded-2xl p-8 shadow-sm mb-6"
          style={{ boxShadow: '0 2px 12px rgba(31, 20, 16, 0.06)' }}
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm font-medium text-[#1F1410]/50 mb-2">Expected Income This Month</p>
              <div className="flex items-baseline gap-3">
                <motion.p
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 200, damping: 15 }}
                  className="text-5xl font-bold text-[#10B981]"
                >
                  ${totalExpectedIncome.toLocaleString()}
                </motion.p>
                <div className="flex items-center gap-1">
                  {incomeChange >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-[#10B981]" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-[#FF6B6B]" />
                  )}
                  <span
                    className="text-sm font-semibold"
                    style={{ color: incomeChange >= 0 ? '#10B981' : '#FF6B6B' }}
                  >
                    {incomeChange >= 0 ? '+' : ''}
                    {Math.abs(incomeChangePercentage).toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#1F1410]/40 mt-2">Based on uploaded documents and bank data</p>
            </div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 15 }}
              className="w-16 h-16 rounded-xl bg-[#10B981]/10 flex items-center justify-center"
            >
              <DollarSign className="w-8 h-8 text-[#10B981]" />
            </motion.div>
          </div>

          {/* Income Sources Breakdown */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#1F1410]/70 mb-3">Income Sources</p>
            {incomeSources.map((source, index) => {
              const Icon = source.icon
              const percentage = (source.amount / totalExpectedIncome) * 100
              return (
                <motion.div
                  key={`${source.name}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                  className="flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${source.color}15` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: source.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-[#1F1410]">{source.name}</span>
                      <span className="text-sm font-bold text-[#1F1410]">${source.amount.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-[#1F1410]/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ delay: 0.7 + index * 0.1, duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: source.color }}
                      />
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Data Sources Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="bg-white rounded-xl p-5 shadow-sm mb-8"
          style={{ boxShadow: '0 2px 8px rgba(31, 20, 16, 0.04)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Connected Banks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#1F1410]/70">Connected Banks</h3>
                <button
                  onClick={handleBankIntegration}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#10B981] hover:bg-[#10B981]/5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bank</span>
                </button>
              </div>
              <div className="space-y-2">
                {connectedBanks.map((bank, index) => (
                  <motion.div
                    key={bank.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.05 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-4 h-4 text-[#10B981]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1F1410] truncate">{bank.name}</p>
                      <p className="text-xs text-[#1F1410]/40">Synced {bank.lastSync}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Pay Slips */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#1F1410]/70">Pay Slips</h3>
                <button
                  onClick={handleUploadDocument}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#10B981] hover:bg-[#10B981]/5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Pay Slip</span>
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
                    {uploadedDocuments} {uploadedDocuments === 1 ? 'document' : 'documents'}
                  </p>
                  <p className="text-xs text-[#1F1410]/40">Pay stubs and tax returns</p>
                </div>
              </motion.div>
            </div>
          </div>

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
                onClick={() => setImportError(null)}
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
      </div>

      {/* Paystub Review Modal */}
      {importResult?.parsedData && importResult?.validation && (
        <PaystubReviewModal
          isOpen={showReviewModal}
          onClose={handleReviewModalClose}
          parsedData={importResult.parsedData}
          validation={importResult.validation}
          fileName={currentFileName}
          pdfFile={currentPdfFile}
          onSaveSuccess={handleSaveSuccess}
        />
      )}
    </div>
  )
}
