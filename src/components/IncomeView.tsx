import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  FileText,
  Building2,
  TrendingDown,
  DollarSign,
  Plus,
  Briefcase,
  LucideIcon,
  Loader2,
  AlertCircle,
  CheckCircle,
  Upload,
} from 'lucide-react'
import { processPaystubPDF, type ImportResult } from '../lib/paystubImport'
import { isPDFFile } from '../lib/pdfExtractor'
import { PaystubReviewModal } from './PaystubReviewModal'
import { supabase } from '../lib/supabase'

type PaystubRecord = {
  id: string
  pay_date: string
  net_pay: number
  gross_pay: number
  employer_name: string | null
  source_file_name: string | null
}

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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // PDF import state
  const [isProcessingPDF, setIsProcessingPDF] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [currentFileName, setCurrentFileName] = useState<string>('')
  const [currentPdfFile, setCurrentPdfFile] = useState<File | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Paystub data from database
  const [paystubs, setPaystubs] = useState<PaystubRecord[]>([])
  const [loadingPaystubs, setLoadingPaystubs] = useState(true)

  const connectedBanks: ConnectedBank[] = [
    { name: 'Chase Checking', lastSync: '2 hours ago', accountType: 'Checking' },
    { name: 'Wells Fargo Savings', lastSync: '1 day ago', accountType: 'Savings' },
  ]

  // Fetch paystubs from database
  const fetchPaystubs = useCallback(async () => {
    setLoadingPaystubs(true)
    const { data, error } = await supabase
      .from('paystubs')
      .select('id, pay_date, net_pay, gross_pay, employer_name, source_file_name')
      .order('pay_date', { ascending: false })

    if (error) {
      console.error('Error fetching paystubs:', error)
    } else if (data) {
      setPaystubs(data)
    }
    setLoadingPaystubs(false)
  }, [])

  // Fetch on mount
  useEffect(() => {
    fetchPaystubs()
  }, [fetchPaystubs])

  // Calculate income from paystubs
  // Smart logic: use current month if available, otherwise use most recent month's data
  const now = new Date()

  const currentMonthPaystubs = paystubs.filter((p) => {
    const payDate = new Date(p.pay_date)
    return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear()
  })

  // Group all paystubs by month to find recent data
  const paysByMonth: Record<string, { total: number; paystubs: PaystubRecord[] }> = {}
  paystubs.forEach((p) => {
    const payDate = new Date(p.pay_date)
    const monthKey = `${payDate.getFullYear()}-${payDate.getMonth()}`
    if (!paysByMonth[monthKey]) {
      paysByMonth[monthKey] = { total: 0, paystubs: [] }
    }
    paysByMonth[monthKey].total += Number(p.net_pay)
    paysByMonth[monthKey].paystubs.push(p)
  })

  // Determine which paystubs to show and use for income
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`
  let displayPaystubs: PaystubRecord[] = currentMonthPaystubs
  let salaryIncome = currentMonthPaystubs.reduce((sum, p) => sum + Number(p.net_pay), 0)
  let usingHistoricalData = false

  // If no current month data, use most recent month
  if (currentMonthPaystubs.length === 0 && Object.keys(paysByMonth).length > 0) {
    const sortedMonths = Object.keys(paysByMonth).sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number)
      const [yearB, monthB] = b.split('-').map(Number)
      return yearB - yearA || monthB - monthA
    })

    if (sortedMonths.length > 0 && sortedMonths[0] !== currentMonthKey) {
      const recentMonth = paysByMonth[sortedMonths[0]]
      displayPaystubs = recentMonth.paystubs
      salaryIncome = recentMonth.total
      usingHistoricalData = true
    }
  }

  // Build income sources from paystub data
  const incomeSources: IncomeSource[] = salaryIncome > 0
    ? [{ name: 'Salary', amount: salaryIncome, icon: Briefcase, color: '#10B981' }]
    : []

  const totalExpectedIncome = incomeSources.reduce((sum, source) => sum + source.amount, 0)

  // Previous month income for comparison
  const previousMonthPaystubs = paystubs.filter((p) => {
    const payDate = new Date(p.pay_date)
    const now = new Date()
    const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    return payDate.getMonth() === prevMonth && payDate.getFullYear() === prevYear
  })
  const previousMonthIncome = previousMonthPaystubs.reduce((sum, p) => sum + Number(p.net_pay), 0)

  const incomeChange = totalExpectedIncome - previousMonthIncome
  const incomeChangePercentage = previousMonthIncome > 0 ? (incomeChange / previousMonthIncome) * 100 : 0

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const files = Array.from(e.target.files)

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

  const handleSaveSuccess = () => {
    setSuccessMessage(`Paycheck from "${currentFileName}" saved successfully!`)
    // Clear the success message after 5 seconds
    setTimeout(() => setSuccessMessage(null), 5000)

    // Refetch paystubs to update income display
    fetchPaystubs()
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
              <p className="text-xs text-[#1F1410]/40 mt-2">
                {usingHistoricalData ? (
                  <>Based on {displayPaystubs.length} paycheck{displayPaystubs.length !== 1 ? 's' : ''} from previous month</>
                ) : (
                  <>Based on {currentMonthPaystubs.length} paycheck{currentMonthPaystubs.length !== 1 ? 's' : ''} this month</>
                )}
              </p>
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
            <div className="flex items-center gap-2 mb-3">
              <p className="text-sm font-semibold text-[#1F1410]/70">Salary Income</p>
              {usingHistoricalData && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F59E0B]/10 text-[#F59E0B]">
                  Based on recent data
                </span>
              )}
            </div>
            {loadingPaystubs ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-[#10B981] animate-spin" />
              </div>
            ) : displayPaystubs.length === 0 ? (
              <p className="text-sm text-[#1F1410]/40 py-4 text-center">
                No paychecks uploaded yet
              </p>
            ) : (
              displayPaystubs.map((paystub, index) => {
                const percentage = totalExpectedIncome > 0 ? (Number(paystub.net_pay) / totalExpectedIncome) * 100 : 0
                const payDate = new Date(paystub.pay_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                return (
                  <motion.div
                    key={paystub.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.3 }}
                    className="flex items-center gap-4"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#10B98115' }}
                    >
                      <Briefcase className="w-5 h-5" style={{ color: '#10B981' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#1F1410]">
                          Paycheck ({payDate})
                        </span>
                        <span className="text-sm font-bold text-[#1F1410]">
                          ${Number(paystub.net_pay).toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#1F1410]/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ delay: 0.7 + index * 0.1, duration: 0.6, ease: 'easeOut' }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: '#10B981' }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )
              })
            )}
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

            {/* Paychecks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#1F1410]/70">Paychecks</h3>
                <button
                  onClick={handleUploadDocument}
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
                    {loadingPaystubs ? '...' : paystubs.length} {paystubs.length === 1 ? 'paycheck' : 'paychecks'}
                  </p>
                  <p className="text-xs text-[#1F1410]/40">Uploaded salary documents</p>
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
