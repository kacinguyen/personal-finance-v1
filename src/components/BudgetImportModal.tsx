import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Upload,
  FileText,
  Loader2,
  Check,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  SkipForward,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  ChevronDown,
} from 'lucide-react'
import type { Category, CategoryType } from '../types/category'
import type { BudgetMatchResult, BudgetImportResult } from '../types/budgetImport'
import { parseBudgetCSV, matchCategoriesToCSV, executeBudgetImport } from '../lib/budgetCsvImport'
import { useUser } from '../hooks/useUser'
import { useCategories } from '../hooks/useCategories'

type Step = 'upload' | 'review' | 'complete'

interface BudgetImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImportSuccess: () => void
}

export function BudgetImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: BudgetImportModalProps) {
  const { userId } = useUser()
  const { categories } = useCategories()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('upload')
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [matches, setMatches] = useState<BudgetMatchResult[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<BudgetImportResult | null>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    setParseErrors([])

    try {
      const text = await file.text()
      const parseResult = parseBudgetCSV(text)

      if (!parseResult.success) {
        setParseErrors(parseResult.errors)
        return
      }

      if (parseResult.errors.length > 0) {
        setParseErrors(parseResult.errors)
      }

      // Match categories
      const matchResults = matchCategoriesToCSV(parseResult.rows, categories)
      setMatches(matchResults)
      setStep('review')
    } catch (err) {
      setParseErrors([err instanceof Error ? err.message : 'Failed to read file'])
    }

    e.target.value = ''
  }

  const handleMatchActionChange = (index: number, action: 'update' | 'create' | 'skip') => {
    setMatches((prev) =>
      prev.map((m, i) => (i === index ? { ...m, action } : m))
    )
  }

  const handleMatchCategoryChange = (index: number, category: Category) => {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === index
          ? { ...m, selectedCategory: category, action: 'update' }
          : m
      )
    )
  }

  const handleMatchTypeChange = (index: number, type: CategoryType) => {
    setMatches((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, selectedType: type } : m
      )
    )
  }

  const handleImport = async () => {
    if (!userId) return

    setIsImporting(true)
    const result = await executeBudgetImport(matches, userId)
    setImportResult(result)
    setIsImporting(false)
    setStep('complete')

    if (result.updatedCount > 0 || result.createdCount > 0) {
      onImportSuccess()
    }
  }

  const handleClose = () => {
    if (!isImporting) {
      setStep('upload')
      setParseErrors([])
      setMatches([])
      setImportResult(null)
      onClose()
    }
  }

  const handleStartOver = () => {
    setStep('upload')
    setParseErrors([])
    setMatches([])
    setImportResult(null)
  }

  const itemsToProcess = matches.filter((m) => m.action !== 'skip')

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1410]/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#6366F1]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#1F1410]">Import Budget CSV</h2>
                <p className="text-sm text-[#1F1410]/50">
                  {step === 'upload' && 'Upload a CSV file with budget data'}
                  {step === 'review' && 'Review category matches'}
                  {step === 'complete' && 'Import complete'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5 text-[#1F1410]/60" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#1F1410]/20 rounded-xl p-8 text-center cursor-pointer hover:border-[#6366F1]/50 hover:bg-[#6366F1]/5 transition-all"
                >
                  <Upload className="w-10 h-10 text-[#1F1410]/30 mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#1F1410]">
                    Click to upload CSV file
                  </p>
                  <p className="text-xs text-[#1F1410]/50 mt-1">
                    or drag and drop
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Example Format */}
                <div className="bg-[#1F1410]/[0.02] rounded-xl p-4">
                  <p className="text-xs font-semibold text-[#1F1410]/50 uppercase tracking-wide mb-2">
                    Expected CSV Format
                  </p>
                  <pre className="text-xs text-[#1F1410]/70 font-mono bg-white rounded-lg p-3 overflow-x-auto">
{`category,monthly_budget,type
Groceries,600,need
Restaurants,300,want
Entertainment,200,want`}
                  </pre>
                  <p className="text-[10px] text-[#1F1410]/40 mt-2">
                    The "type" column is optional. Valid types: need, want
                  </p>
                </div>

                {/* Parse Errors */}
                {parseErrors.length > 0 && (
                  <div className="bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-4 h-4 text-[#FF6B6B]" />
                      <p className="text-sm font-medium text-[#FF6B6B]">
                        Parsing Issues
                      </p>
                    </div>
                    <ul className="text-xs text-[#FF6B6B]/80 space-y-1">
                      {parseErrors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Review */}
            {step === 'review' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#1F1410]/60">
                    {matches.length} items found
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                      {matches.filter((m) => m.matchStatus === 'exact').length} exact
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                      {matches.filter((m) => m.matchStatus === 'fuzzy').length} fuzzy
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-[#6366F1]" />
                      {matches.filter((m) => m.matchStatus === 'new').length} new
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {matches.map((match, index) => (
                    <MatchRow
                      key={index}
                      match={match}
                      categories={categories}
                      onActionChange={(action) => handleMatchActionChange(index, action)}
                      onCategoryChange={(cat) => handleMatchCategoryChange(index, cat)}
                      onTypeChange={(type) => handleMatchTypeChange(index, type)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Complete */}
            {step === 'complete' && importResult && (
              <div className="text-center py-6">
                {importResult.updatedCount + importResult.createdCount > 0 ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#1F1410] mb-2">
                      Import Successful
                    </h3>
                    <div className="flex items-center justify-center gap-4 text-sm text-[#1F1410]/60 mb-4">
                      {importResult.updatedCount > 0 && (
                        <span>{importResult.updatedCount} updated</span>
                      )}
                      {importResult.createdCount > 0 && (
                        <span>{importResult.createdCount} created</span>
                      )}
                      {importResult.skippedCount > 0 && (
                        <span>{importResult.skippedCount} skipped</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-[#F59E0B]/10 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="w-8 h-8 text-[#F59E0B]" />
                    </div>
                    <h3 className="text-lg font-bold text-[#1F1410] mb-2">
                      No Changes Made
                    </h3>
                    <p className="text-sm text-[#1F1410]/60 mb-4">
                      All items were skipped
                    </p>
                  </>
                )}

                {importResult.errors.length > 0 && (
                  <div className="bg-[#FF6B6B]/5 border border-[#FF6B6B]/20 rounded-xl p-4 mt-4 text-left">
                    <p className="text-sm font-medium text-[#FF6B6B] mb-2">
                      Some items had errors:
                    </p>
                    <ul className="text-xs text-[#FF6B6B]/80 space-y-1">
                      {importResult.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>• ...and {importResult.errors.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#1F1410]/10 bg-[#1F1410]/[0.02]">
            <div>
              {step === 'review' && (
                <button
                  onClick={handleStartOver}
                  className="flex items-center gap-1.5 text-sm text-[#1F1410]/50 hover:text-[#1F1410] transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Start over
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                disabled={isImporting}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors disabled:opacity-50"
              >
                {step === 'complete' ? 'Close' : 'Cancel'}
              </button>
              {step === 'review' && (
                <button
                  onClick={handleImport}
                  disabled={isImporting || itemsToProcess.length === 0}
                  className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#6366F1] hover:bg-[#6366F1]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {isImporting ? 'Importing...' : `Import (${itemsToProcess.length})`}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// Match row component
function MatchRow({
  match,
  categories,
  onActionChange,
  onCategoryChange,
  onTypeChange,
}: {
  match: BudgetMatchResult
  categories: Category[]
  onActionChange: (action: 'update' | 'create' | 'skip') => void
  onCategoryChange: (category: Category) => void
  onTypeChange: (type: CategoryType) => void
}) {
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false)

  const getStatusColor = () => {
    switch (match.matchStatus) {
      case 'exact':
        return '#10B981'
      case 'fuzzy':
        return '#F59E0B'
      case 'new':
        return '#6366F1'
    }
  }

  const getStatusLabel = () => {
    switch (match.matchStatus) {
      case 'exact':
        return 'Exact match'
      case 'fuzzy':
        return 'Fuzzy match'
      case 'new':
        return 'New category'
    }
  }

  const displayCategory = match.selectedCategory || match.matchedCategory

  return (
    <div
      className={`rounded-xl border-2 p-3 transition-all ${
        match.action === 'skip'
          ? 'border-[#1F1410]/10 bg-[#1F1410]/[0.02] opacity-60'
          : 'border-[#1F1410]/10 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side: CSV data */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-[#1F1410]">
              {match.csvRow.category}
            </span>
            <span
              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${getStatusColor()}15`,
                color: getStatusColor(),
              }}
            >
              {getStatusLabel()}
            </span>
          </div>
          <p className="text-xs text-[#1F1410]/50">
            Budget: ${match.csvRow.monthly_budget.toLocaleString()}
            {match.csvRow.type && ` • Type: ${match.csvRow.type}`}
          </p>
        </div>

        {/* Right side: Actions */}
        <div className="flex items-center gap-2">
          {match.action !== 'skip' && match.matchStatus !== 'new' && (
            <div className="relative">
              <button
                onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg bg-[#1F1410]/[0.03] hover:bg-[#1F1410]/[0.06] transition-colors"
              >
                <span className="text-[#1F1410]/70 truncate max-w-24">
                  {displayCategory?.name || 'Select'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#1F1410]/40" />
              </button>
              {showCategoryDropdown && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-white rounded-lg shadow-lg border border-[#1F1410]/10 py-1 min-w-36 max-h-40 overflow-y-auto">
                  {categories
                    .filter((c) => c.category_type === 'need' || c.category_type === 'want')
                    .map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          onCategoryChange(cat)
                          setShowCategoryDropdown(false)
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-[#1F1410]/5 flex items-center justify-between"
                      >
                        <span className="text-[#1F1410]">{cat.name}</span>
                        {displayCategory?.id === cat.id && (
                          <Check className="w-3 h-3 text-[#10B981]" />
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          {match.action !== 'skip' && match.matchStatus === 'new' && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onTypeChange('need')}
                className={`p-1.5 rounded-lg transition-colors ${
                  match.selectedType === 'need'
                    ? 'bg-[#10B981]/10 text-[#10B981]'
                    : 'text-[#1F1410]/30 hover:bg-[#1F1410]/5'
                }`}
                title="Need"
              >
                <Shield className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onTypeChange('want')}
                className={`p-1.5 rounded-lg transition-colors ${
                  match.selectedType === 'want'
                    ? 'bg-[#A855F7]/10 text-[#A855F7]'
                    : 'text-[#1F1410]/30 hover:bg-[#1F1410]/5'
                }`}
                title="Want"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => onActionChange(match.action === 'skip' ? (match.matchStatus === 'new' ? 'create' : 'update') : 'skip')}
            className={`p-1.5 rounded-lg transition-colors ${
              match.action === 'skip'
                ? 'bg-[#1F1410]/5 text-[#1F1410]/40'
                : 'text-[#1F1410]/30 hover:bg-[#FF6B6B]/10 hover:text-[#FF6B6B]'
            }`}
            title={match.action === 'skip' ? 'Include' : 'Skip'}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Match arrow */}
      {match.action !== 'skip' && displayCategory && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#1F1410]/5">
          <ArrowRight className="w-3 h-3 text-[#1F1410]/30" />
          <span className="text-xs text-[#1F1410]/50">
            {match.matchStatus === 'new' ? 'Create category: ' : 'Update budget for: '}
          </span>
          <span className="text-xs font-medium text-[#1F1410]">
            {match.matchStatus === 'new' ? match.csvRow.category : displayCategory.name}
          </span>
        </div>
      )}

      {match.action !== 'skip' && match.matchStatus === 'new' && !displayCategory && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#1F1410]/5">
          <Plus className="w-3 h-3 text-[#6366F1]" />
          <span className="text-xs text-[#6366F1]">
            Will create new category "{match.csvRow.category}"
          </span>
        </div>
      )}
    </div>
  )
}
