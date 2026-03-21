import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { type ImportResult } from '../../lib/paystubImport'
import { PaystubReviewModal } from '../modals/PaystubReviewModal'
import { supabase } from '../../lib/supabase'
import { MonthPicker } from '../common/MonthPicker'
import { getMonthRange } from '../../lib/dateUtils'
import { useCategories } from '../../hooks/useCategories'
import { getIcon, DEFAULT_COLOR } from '../../lib/iconMap'
import type { Transaction } from '../../types/transaction'

import { NextPaycheckCard } from '../income/NextPaycheckCard'
import { YearlyIncomeChart } from '../income/YearlyIncomeChart'
import { IncomeSummaryTab } from '../income/IncomeSummaryTab'
import { IncomeTypesTab } from '../income/IncomeTypesTab'
import { IncomeTransactionHistoryTab } from '../income/IncomeTransactionHistoryTab'

export type PaystubRecord = {
  id: string
  pay_date: string
  net_pay: number
  gross_pay: number
  bonus_pay: number | null
  dividend_equivalent: number | null
  employer_name: string | null
  source_file_name: string | null
  // Contribution fields
  traditional_401k: number | null
  roth_401k: number | null
  after_tax_401k: number | null
  employer_401k_match: number | null
  hsa_contribution: number | null
  espp_contribution: number | null
  // Pre-tax deductions
  health_insurance: number | null
  dental_insurance: number | null
  vision_insurance: number | null
  life_insurance: number | null
  ad_and_d_insurance: number | null
  fsa_contribution: number | null
  other_pretax: number | null
  // Taxes
  federal_income_tax: number | null
  state_income_tax: number | null
  social_security_tax: number | null
  medicare_tax: number | null
  local_tax: number | null
  state_disability_insurance: number | null
  other_taxes: number | null
  // Post-tax deductions
  other_posttax: number | null
}


export function IncomeView() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Month selection state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

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


  // Fetch paystubs from database
  const fetchPaystubs = useCallback(async () => {
    setLoadingPaystubs(true)
    const { data, error } = await supabase
      .from('paystubs')
      .select('id, pay_date, net_pay, gross_pay, bonus_pay, dividend_equivalent, employer_name, source_file_name, traditional_401k, roth_401k, after_tax_401k, employer_401k_match, hsa_contribution, espp_contribution, health_insurance, dental_insurance, vision_insurance, life_insurance, ad_and_d_insurance, fsa_contribution, other_pretax, federal_income_tax, state_income_tax, social_security_tax, medicare_tax, local_tax, state_disability_insurance, other_taxes, other_posttax')
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

  // Income transactions (all income categories)
  const { incomeCategories, findCategoryById } = useCategories()

  const incomeCategoryIds = useMemo(
    () => incomeCategories.map(c => c.id),
    [incomeCategories]
  )

  const salaryCategoryId = useMemo(
    () => incomeCategories.find(c => c.name === 'Salary')?.id,
    [incomeCategories]
  )

  const reimbursementCategoryId = useMemo(
    () => incomeCategories.find(c => c.name === 'Reimbursements')?.id,
    [incomeCategories]
  )

  const [incomeTransactions, setIncomeTransactions] = useState<Transaction[]>([])
  const [loadingIncomeTransactions, setLoadingIncomeTransactions] = useState(false)
  const [prevMonthSalaryTotal, setPrevMonthSalaryTotal] = useState(0)

  const fetchIncomeTransactions = useCallback(async () => {
    if (incomeCategoryIds.length === 0) {
      setIncomeTransactions([])
      setPrevMonthSalaryTotal(0)
      return
    }
    setLoadingIncomeTransactions(true)
    const { startOfMonth, endOfMonth } = getMonthRange(selectedMonth)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .in('category_id', incomeCategoryIds)
      .gte('date', startOfMonth)
      .lte('date', endOfMonth)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching income transactions:', error)
    } else if (data) {
      setIncomeTransactions(data as Transaction[])
    }

    // Fetch previous month salary transactions (for 0-check fallback)
    if (salaryCategoryId) {
      const prevMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
      const { startOfMonth: prevStart, endOfMonth: prevEnd } = getMonthRange(prevMonth)
      const { data: prevData, error: prevError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('category_id', salaryCategoryId)
        .gte('date', prevStart)
        .lte('date', prevEnd)

      if (prevError) {
        console.error('Error fetching prev month salary:', prevError)
        setPrevMonthSalaryTotal(0)
      } else {
        setPrevMonthSalaryTotal((prevData || []).reduce((sum, tx) => sum + Math.abs(tx.amount), 0))
      }
    } else {
      setPrevMonthSalaryTotal(0)
    }

    setLoadingIncomeTransactions(false)
  }, [selectedMonth, incomeCategoryIds, salaryCategoryId])

  useEffect(() => {
    fetchIncomeTransactions()
  }, [fetchIncomeTransactions])

  // Fetch reimbursement transactions for the full year (for the chart)
  const [reimbursementTransactions, setReimbursementTransactions] = useState<Transaction[]>([])

  const fetchReimbursementTransactions = useCallback(async () => {
    if (!reimbursementCategoryId) {
      setReimbursementTransactions([])
      return
    }
    const chartYear = selectedMonth.getFullYear()
    const startDate = `${chartYear - 1}-01-01`
    const endDate = `${chartYear}-12-31`
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('category_id', reimbursementCategoryId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) {
      console.error('Error fetching reimbursement transactions:', error)
    } else if (data) {
      setReimbursementTransactions(data as Transaction[])
    }
  }, [reimbursementCategoryId, selectedMonth])

  useEffect(() => {
    fetchReimbursementTransactions()
  }, [fetchReimbursementTransactions])

  // Split income transactions into salary vs other
  const { salaryTransactions, salaryTransactionIncome, otherIncome } = useMemo(() => {
    const salary: Transaction[] = []
    const otherGrouped = new Map<string, { transactions: Transaction[]; total: number }>()

    for (const tx of incomeTransactions) {
      if (tx.category_id === salaryCategoryId) {
        salary.push(tx)
      } else {
        const key = tx.category_id || 'uncategorized'
        const group = otherGrouped.get(key) || { transactions: [], total: 0 }
        group.transactions.push(tx)
        group.total += Math.abs(tx.amount)
        otherGrouped.set(key, group)
      }
    }

    const salaryTotal = salary.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

    const otherCategories = Array.from(otherGrouped.entries()).map(([catId, group]) => {
      const cat = catId !== 'uncategorized' ? findCategoryById(catId) : undefined
      const IconComponent = getIcon(cat?.icon)
      return {
        name: cat?.name || 'Other',
        amount: group.total,
        icon: IconComponent,
        color: cat?.color || DEFAULT_COLOR,
        count: group.transactions.length,
        transactions: group.transactions,
      }
    })

    const otherTotal = otherCategories.reduce((sum, c) => sum + c.amount, 0)

    return {
      salaryTransactions: salary,
      salaryTransactionIncome: salaryTotal,
      otherIncome: { categories: otherCategories, total: otherTotal },
    }
  }, [incomeTransactions, salaryCategoryId, findCategoryById])

  // Calculate income from paystubs for selected month
  const selectedMonthPaystubs = useMemo(() => {
    return paystubs.filter((p) => {
      const payDate = new Date(p.pay_date)
      return payDate.getMonth() === selectedMonth.getMonth() && payDate.getFullYear() === selectedMonth.getFullYear()
    })
  }, [paystubs, selectedMonth])

  // Group all paystubs by month to find recent data
  const paysByMonth = useMemo(() => {
    const grouped: Record<string, { total: number; paystubs: PaystubRecord[] }> = {}
    paystubs.forEach((p) => {
      const payDate = new Date(p.pay_date)
      const monthKey = `${payDate.getFullYear()}-${payDate.getMonth()}`
      if (!grouped[monthKey]) {
        grouped[monthKey] = { total: 0, paystubs: [] }
      }
      grouped[monthKey].total += Number(p.net_pay)
      grouped[monthKey].paystubs.push(p)
    })
    return grouped
  }, [paystubs])

  // Determine which paystubs to show for contributions/waterfall
  const displayPaystubs = useMemo(() => {
    const selectedMonthKey = `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`

    // If selected month has data, use it
    if (selectedMonthPaystubs.length > 0) {
      return selectedMonthPaystubs
    }

    // No selected month data, use most recent month for contributions/waterfall
    if (Object.keys(paysByMonth).length > 0) {
      const sortedMonths = Object.keys(paysByMonth).sort((a, b) => {
        const [yearA, monthA] = a.split('-').map(Number)
        const [yearB, monthB] = b.split('-').map(Number)
        return yearB - yearA || monthB - monthA
      })

      if (sortedMonths.length > 0 && sortedMonths[0] !== selectedMonthKey) {
        return paysByMonth[sortedMonths[0]].paystubs
      }
    }

    return [] as PaystubRecord[]
  }, [selectedMonth, selectedMonthPaystubs, paysByMonth])

  // Salary projection logic
  const { expectedSalaryIncome, isProjected, projectionBasis } = useMemo(() => {
    if (salaryTransactions.length >= 2) {
      return { expectedSalaryIncome: salaryTransactionIncome, isProjected: false, projectionBasis: 'actual' as const }
    } else if (salaryTransactions.length === 1) {
      return { expectedSalaryIncome: salaryTransactionIncome * 2, isProjected: true, projectionBasis: 'one-check' as const }
    } else {
      return {
        expectedSalaryIncome: prevMonthSalaryTotal,
        isProjected: prevMonthSalaryTotal > 0,
        projectionBasis: 'previous-month' as const,
      }
    }
  }, [salaryTransactions.length, salaryTransactionIncome, prevMonthSalaryTotal])

  const totalExpectedIncome = expectedSalaryIncome + otherIncome.total

  // Previous month income for comparison (relative to selected month)
  const previousMonthIncome = useMemo(() => {
    const prevMonth = selectedMonth.getMonth() === 0 ? 11 : selectedMonth.getMonth() - 1
    const prevYear = selectedMonth.getMonth() === 0 ? selectedMonth.getFullYear() - 1 : selectedMonth.getFullYear()
    const prevMonthKey = `${prevYear}-${prevMonth}`
    return paysByMonth[prevMonthKey]?.total || 0
  }, [selectedMonth, paysByMonth])

  const incomeChange = totalExpectedIncome - previousMonthIncome
  const incomeChangePercentage = previousMonthIncome > 0 ? (incomeChange / previousMonthIncome) * 100 : 0

  // Calculate contribution totals from paystubs
  const contributions = useMemo(() => {
    const totals = {
      traditional_401k: 0,
      roth_401k: 0,
      after_tax_401k: 0,
      employer_401k_match: 0,
      hsa: 0,
      espp: 0,
    }

    displayPaystubs.forEach(p => {
      totals.traditional_401k += Number(p.traditional_401k) || 0
      totals.roth_401k += Number(p.roth_401k) || 0
      totals.after_tax_401k += Number(p.after_tax_401k) || 0
      totals.employer_401k_match += Number(p.employer_401k_match) || 0
      totals.hsa += Number(p.hsa_contribution) || 0
      totals.espp += Number(p.espp_contribution) || 0
    })

    const total401k = totals.traditional_401k + totals.roth_401k + totals.after_tax_401k
    const total401kWithMatch = total401k + totals.employer_401k_match

    return {
      ...totals,
      total401k,
      total401kWithMatch,
    }
  }, [displayPaystubs])

  // YTD contribution totals (from all paystubs)
  const ytdContributions = useMemo(() => {
    const currentYear = selectedMonth.getFullYear()
    const ytdPaystubs = paystubs.filter(p => new Date(p.pay_date).getFullYear() === currentYear)

    const totals = {
      traditional_401k: 0,
      roth_401k: 0,
      after_tax_401k: 0,
      employer_401k_match: 0,
      hsa: 0,
      espp: 0,
    }

    ytdPaystubs.forEach(p => {
      totals.traditional_401k += Number(p.traditional_401k) || 0
      totals.roth_401k += Number(p.roth_401k) || 0
      totals.after_tax_401k += Number(p.after_tax_401k) || 0
      totals.employer_401k_match += Number(p.employer_401k_match) || 0
      totals.hsa += Number(p.hsa_contribution) || 0
      totals.espp += Number(p.espp_contribution) || 0
    })

    const total401k = totals.traditional_401k + totals.roth_401k + totals.after_tax_401k
    const total401kWithMatch = total401k + totals.employer_401k_match

    return {
      ...totals,
      total401k,
      total401kWithMatch,
    }
  }, [paystubs, selectedMonth])

  // Tab state
  const [activeIncomeTab, setActiveIncomeTab] = useState<'summary' | 'income-types' | 'history'>('summary')

  const incomeTabs = [
    { id: 'summary' as const, label: 'Summary' },
    { id: 'income-types' as const, label: 'Income Types' },
    { id: 'history' as const, label: 'Transactions' },
  ]

  const handleImportResult = useCallback((result: ImportResult) => {
    setImportResult(result)
    setShowReviewModal(true)
  }, [])

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

  const handleUploadDocument = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-[#1F1410]">Income</h1>
            <MonthPicker selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
          </div>
        </motion.div>

        {/* Yearly Income Chart — Full Width */}
        <YearlyIncomeChart paystubs={paystubs} selectedMonth={selectedMonth} reimbursementTransactions={reimbursementTransactions} />

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column (2/3 width) */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="bg-white rounded-2xl overflow-hidden border border-[#1F1410]/5"
            >
              {/* Tab bar */}
              <div className="flex border-b border-[#1F1410]/5">
                {incomeTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveIncomeTab(tab.id)}
                    className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                      activeIncomeTab === tab.id
                        ? 'text-[#10B981]'
                        : 'text-[#1F1410]/50 hover:text-[#1F1410]/80'
                    }`}
                  >
                    {tab.label}
                    {activeIncomeTab === tab.id && (
                      <motion.div
                        layoutId="income-tab-indicator"
                        className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#10B981] rounded-full"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6">
                {activeIncomeTab === 'summary' && (
                  <IncomeSummaryTab
                    selectedMonth={selectedMonth}
                    totalExpectedIncome={totalExpectedIncome}
                    expectedSalaryIncome={expectedSalaryIncome}
                    otherIncomeTotal={otherIncome.total}
                    otherIncomeCategories={otherIncome.categories}
                    incomeChange={incomeChange}
                    incomeChangePercentage={incomeChangePercentage}
                    isProjected={isProjected}
                    projectionBasis={projectionBasis}
                    salaryTransactions={salaryTransactions}
                    loading={loadingIncomeTransactions}
                    paystubs={paystubs}
                  />
                )}
                {activeIncomeTab === 'income-types' && (
                  <IncomeTypesTab
                    selectedMonth={selectedMonth}
                    contributions={contributions}
                    ytdContributions={ytdContributions}
                    displayPaystubs={displayPaystubs}
                    paystubs={paystubs}
                    expectedSalaryIncome={expectedSalaryIncome}
                    otherIncomeTotal={otherIncome.total}
                  />
                )}
                {activeIncomeTab === 'history' && (
                  <IncomeTransactionHistoryTab
                    selectedMonth={selectedMonth}
                    salaryTransactions={salaryTransactions}
                    otherIncome={otherIncome}
                    loading={loadingIncomeTransactions}
                    paystubs={paystubs}
                    isProcessingPDF={isProcessingPDF}
                    currentFileName={currentFileName}
                    importError={importError}
                    successMessage={successMessage}
                    onProcessingStart={() => { setIsProcessingPDF(true); setSuccessMessage(null) }}
                    onProcessingEnd={() => setIsProcessingPDF(false)}
                    onFileNameChange={setCurrentFileName}
                    onPdfFileChange={setCurrentPdfFile}
                    onImportResult={handleImportResult}
                    onImportError={setImportError}
                    onUploadClick={handleUploadDocument}
                    fileInputRef={fileInputRef}
                  />
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column - Coming Up */}
          <div className="lg:col-span-1 space-y-6">
            <NextPaycheckCard
              paystubs={paystubs}
              onUploadClick={handleUploadDocument}
              loading={loadingPaystubs}
            />
          </div>
        </div>
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
