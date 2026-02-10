import { ChevronDown } from 'lucide-react'
import type { Filters, FilterType, ReviewFilter } from '../views/TransactionsView'
import type { UICategory } from '../../types/category'

type TransactionFilterPanelProps = {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  filterDropdownPos: { top: number; left: number }
  showCategoryDropdown: boolean
  setShowCategoryDropdown: (v: boolean) => void
  showSourceDropdown: boolean
  setShowSourceDropdown: (v: boolean) => void
  onClose: () => void
  allUiCategories: UICategory[]
  accountSources: string[]
  toReviewCount: number
}

const filterTypes: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'income', label: 'Income' },
  { id: 'expense', label: 'Expense' },
  { id: 'transfer', label: 'Transfer' },
]

const reviewStatuses: { id: ReviewFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'to_review', label: 'To Review' },
  { id: 'reviewed', label: 'Reviewed' },
]

export function TransactionFilterPanel({
  filters,
  setFilters,
  filterDropdownPos,
  showCategoryDropdown,
  setShowCategoryDropdown,
  showSourceDropdown,
  setShowSourceDropdown,
  onClose,
  allUiCategories,
  accountSources,
  toReviewCount,
}: TransactionFilterPanelProps) {
  const selectedCategory = filters.categoryId
    ? allUiCategories.find(c => c.id === filters.categoryId) ?? null
    : null

  return (
    <>
      {/* Backdrop to close on click outside */}
      <div className="fixed inset-0 z-[99]" onClick={onClose} />

      <div
        className="fixed z-[100] bg-white rounded-xl border border-[#1F1410]/10 shadow-lg p-3 w-[280px]"
        style={{ top: filterDropdownPos.top, left: filterDropdownPos.left }}
      >
        <div className="space-y-3">
          {/* Type */}
          <div>
            <label className="block text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wider mb-1">Type</label>
            <div className="flex flex-wrap gap-1">
              {filterTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilters(f => ({ ...f, type: type.id }))}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    filters.type === type.id
                      ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                      : 'text-[#1F1410]/60 hover:bg-[#1F1410]/5 hover:text-[#1F1410]'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wider mb-1">Status</label>
            <div className="flex flex-wrap gap-1">
              {reviewStatuses.map((status) => (
                <button
                  key={status.id}
                  onClick={() => setFilters(f => ({ ...f, reviewStatus: status.id }))}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    filters.reviewStatus === status.id
                      ? 'bg-[#8B5CF6]/10 text-[#8B5CF6]'
                      : 'text-[#1F1410]/60 hover:bg-[#1F1410]/5 hover:text-[#1F1410]'
                  }`}
                >
                  {status.label}
                  {status.id === 'to_review' && toReviewCount > 0 && (
                    <span className="px-1 py-px rounded text-[9px] font-bold bg-[#3B82F6] text-white min-w-[14px] text-center leading-tight">
                      {toReviewCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wider mb-1">Category</label>
            <div className="relative">
              <button
                onClick={() => {
                  setShowCategoryDropdown(!showCategoryDropdown)
                  setShowSourceDropdown(false)
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[#1F1410]/10 text-xs hover:border-[#1F1410]/20 transition-colors w-full"
              >
                {selectedCategory ? (
                  <>
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${selectedCategory.color}15` }}
                    >
                      <selectedCategory.icon className="w-2.5 h-2.5" style={{ color: selectedCategory.color }} />
                    </div>
                    <span className="text-[#1F1410] flex-1 text-left">{selectedCategory.name}</span>
                  </>
                ) : (
                  <span className="text-[#1F1410]/50 flex-1 text-left">All Categories</span>
                )}
                <ChevronDown className="w-3 h-3 text-[#1F1410]/40" />
              </button>

              {showCategoryDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-[#1F1410]/10 shadow-lg z-[110] min-w-full max-h-[200px] overflow-y-auto">
                  <button
                    onClick={() => {
                      setFilters(f => ({ ...f, categoryId: null }))
                      setShowCategoryDropdown(false)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#1F1410]/50 hover:bg-[#1F1410]/5 transition-colors"
                  >
                    All Categories
                  </button>
                  {allUiCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setFilters(f => ({ ...f, categoryId: cat.id }))
                        setShowCategoryDropdown(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-[#1F1410]/5 transition-colors"
                    >
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center"
                        style={{ backgroundColor: `${cat.color}15` }}
                      >
                        <cat.icon className="w-2.5 h-2.5" style={{ color: cat.color }} />
                      </div>
                      <span className="text-[#1F1410]">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className="block text-[10px] font-semibold text-[#1F1410]/40 uppercase tracking-wider mb-1">Source</label>
            <div className="relative">
              <button
                onClick={() => {
                  setShowSourceDropdown(!showSourceDropdown)
                  setShowCategoryDropdown(false)
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[#1F1410]/10 text-xs hover:border-[#1F1410]/20 transition-colors w-full"
              >
                <span className={`flex-1 text-left ${filters.accountSource ? 'text-[#1F1410]' : 'text-[#1F1410]/50'}`}>
                  {filters.accountSource || 'All Sources'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#1F1410]/40" />
              </button>

              {showSourceDropdown && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg border border-[#1F1410]/10 shadow-lg z-[110] min-w-full max-h-[200px] overflow-y-auto">
                  <button
                    onClick={() => {
                      setFilters(f => ({ ...f, accountSource: null }))
                      setShowSourceDropdown(false)
                    }}
                    className="w-full px-3 py-1.5 text-left text-xs text-[#1F1410]/50 hover:bg-[#1F1410]/5 transition-colors"
                  >
                    All Sources
                  </button>
                  {accountSources.map((source) => (
                    <button
                      key={source}
                      onClick={() => {
                        setFilters(f => ({ ...f, accountSource: source }))
                        setShowSourceDropdown(false)
                      }}
                      className="w-full px-3 py-1.5 text-left text-xs text-[#1F1410] hover:bg-[#1F1410]/5 transition-colors"
                    >
                      {source}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
