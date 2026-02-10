import { motion } from 'framer-motion'
import {
  Search,
  SlidersHorizontal,
  Plus,
  ChevronDown,
  Upload,
  X,
} from 'lucide-react'
import { TAB_COLORS } from '../../lib/colors'
import type { Filters, FilterType, ReviewFilter } from '../views/TransactionsView'
import type { UICategory } from '../../types/category'

type TransactionToolbarProps = {
  searchExpanded: boolean
  setSearchExpanded: (v: boolean) => void
  searchInputRef: React.RefObject<HTMLInputElement>
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  showFiltersPanel: boolean
  toggleFiltersPanel: () => void
  filterButtonRef: React.RefObject<HTMLButtonElement>
  activeFilterCount: number
  showAddDropdown: boolean
  setShowAddDropdown: (v: boolean) => void
  onAddNew: () => void
  onCsvImport: (files: File[]) => void
  fileInputRef: React.RefObject<HTMLInputElement>
  toReviewCount: number
  selectedCategory: UICategory | null
  allFilterTypes: { id: FilterType; label: string }[]
  reviewStatuses: { id: ReviewFilter; label: string }[]
}

export function TransactionToolbar({
  searchExpanded,
  setSearchExpanded,
  searchInputRef,
  filters,
  setFilters,
  showFiltersPanel,
  toggleFiltersPanel,
  filterButtonRef,
  activeFilterCount,
  showAddDropdown,
  setShowAddDropdown,
  onAddNew,
  onCsvImport,
  fileInputRef,
  toReviewCount,
  selectedCategory,
  allFilterTypes,
  reviewStatuses,
}: TransactionToolbarProps) {
  return (
    <div className="p-3 border-b border-[#1F1410]/5">
      <div className="flex items-center gap-2">
        {/* Collapsible Search */}
        {searchExpanded ? (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1F1410]/40" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search transactions..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
              onBlur={() => {
                if (!filters.searchQuery) setSearchExpanded(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setFilters(f => ({ ...f, searchQuery: '' }))
                  setSearchExpanded(false)
                }
              }}
              className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-[#1F1410]/10 text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6]/30 transition-all"
            />
            <button
              onClick={() => {
                setFilters(f => ({ ...f, searchQuery: '' }))
                setSearchExpanded(false)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1F1410]/30 hover:text-[#1F1410]/60"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setSearchExpanded(true)
              setTimeout(() => searchInputRef.current?.focus(), 0)
            }}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[#1F1410]/50 hover:text-[#1F1410] hover:bg-[#1F1410]/5 transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
        )}

        {/* Filter Button */}
        <button
          ref={filterButtonRef}
          onClick={toggleFiltersPanel}
          className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            showFiltersPanel || activeFilterCount > 0
              ? 'border-[#8B5CF6]/30 bg-[#8B5CF6]/5 text-[#8B5CF6]'
              : 'border-[#1F1410]/10 text-[#1F1410]/60 hover:border-[#1F1410]/20 hover:text-[#1F1410]'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="w-4.5 h-4.5 rounded-full bg-[#8B5CF6] text-white text-[10px] font-bold flex items-center justify-center min-w-[18px] px-1">
              {activeFilterCount}
            </span>
          )}
        </button>

        <div className="flex-1" />

        {/* Add Button with Dropdown */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setShowAddDropdown(!showAddDropdown)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: TAB_COLORS.transactions }}
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </motion.button>

          {showAddDropdown && (
            <div
              className="absolute top-full right-0 mt-2 bg-white rounded-xl border border-[#1F1410]/10 shadow-lg z-50 min-w-[160px] overflow-hidden"
              onMouseLeave={() => setShowAddDropdown(false)}
            >
              <button
                onClick={() => {
                  onAddNew()
                  setShowAddDropdown(false)
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#1F1410]/5 transition-colors text-[#1F1410]"
              >
                <Plus className="w-4 h-4 text-[#1F1410]/50" />
                Manual Add
              </button>
              <button
                onClick={() => {
                  fileInputRef.current?.click()
                  setShowAddDropdown(false)
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#1F1410]/5 transition-colors text-[#1F1410]"
              >
                <Upload className="w-4 h-4 text-[#1F1410]/50" />
                Import CSV
              </button>
            </div>
          )}

          {/* Hidden file input for CSV import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                onCsvImport(Array.from(e.target.files))
                e.target.value = ''
              }
            }}
          />
        </div>
      </div>

      {/* Active Filter Chips */}
      {(activeFilterCount > 0 || filters.searchQuery) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {filters.searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1F1410]/5 text-xs text-[#1F1410]/70">
              &ldquo;{filters.searchQuery}&rdquo;
              <button onClick={() => {
                setFilters(f => ({ ...f, searchQuery: '' }))
                if (!filters.searchQuery) setSearchExpanded(false)
              }} className="text-[#1F1410]/40 hover:text-[#1F1410]/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.type !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8B5CF6]/10 text-xs text-[#8B5CF6]">
              {allFilterTypes.find(t => t.id === filters.type)?.label}
              <button onClick={() => setFilters(f => ({ ...f, type: 'all' }))} className="text-[#8B5CF6]/50 hover:text-[#8B5CF6]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.reviewStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3B82F6]/10 text-xs text-[#3B82F6]">
              {reviewStatuses.find(s => s.id === filters.reviewStatus)?.label}
              {filters.reviewStatus === 'to_review' && toReviewCount > 0 && ` (${toReviewCount})`}
              <button onClick={() => setFilters(f => ({ ...f, reviewStatus: 'all' }))} className="text-[#3B82F6]/50 hover:text-[#3B82F6]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: `${selectedCategory.color}15`, color: selectedCategory.color }}>
              {selectedCategory.name}
              <button onClick={() => setFilters(f => ({ ...f, categoryId: null }))} className="opacity-50 hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.accountSource && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1F1410]/5 text-xs text-[#1F1410]/70">
              {filters.accountSource}
              <button onClick={() => setFilters(f => ({ ...f, accountSource: null }))} className="text-[#1F1410]/40 hover:text-[#1F1410]/70">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeFilterCount > 1 && (
            <button
              onClick={() => setFilters({ type: 'all', reviewStatus: 'all', categoryId: null, accountSource: null, searchQuery: '' })}
              className="text-[10px] text-[#1F1410]/40 hover:text-[#1F1410]/60 transition-colors ml-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
