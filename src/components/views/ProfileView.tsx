import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Mail, LogOut, Wand2, Trash2, Plus, X, Search, Check, Building2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useUser } from '../../hooks/useUser'
import { useMerchantRules } from '../../hooks/useMerchantRules'
import type { MatchType, MerchantRule } from '../../hooks/useMerchantRules'
import { useCategories } from '../../hooks/useCategories'
import { dbCategoryToUI } from '../../lib/categoryUtils'
import type { UICategory } from '../../types/category'
import { TAB_COLORS } from '../../lib/colors'
import { supabase } from '../../lib/supabase'

function RuleCategoryPicker({
  categories,
  selectedCategoryId,
  onSelect,
}: {
  categories: UICategory[]
  selectedCategoryId: string | null
  onSelect: (category: UICategory) => void
}) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(false)

  const filtered = search
    ? categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories

  const selectedCategory = selectedCategoryId
    ? categories.find(c => c.id === selectedCategoryId)
    : null

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left text-sm bg-white rounded-xl border border-[#1F1410]/10 px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6]/40 text-[#1F1410] transition-all flex items-center gap-2"
      >
        {selectedCategory ? (
          <>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: selectedCategory.color + '20' }}
            >
              <selectedCategory.icon className="w-3 h-3" style={{ color: selectedCategory.color }} />
            </div>
            <span>{selectedCategory.name}</span>
          </>
        ) : (
          <span className="text-[#1F1410]/40">Select a category...</span>
        )}
      </button>

      {expanded && (
        <div className="mt-1.5 border border-[#1F1410]/10 rounded-xl overflow-hidden bg-white">
          {/* Search */}
          <div className="p-2 border-b border-[#1F1410]/5">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#1F1410]/[0.03]">
              <Search className="w-3.5 h-3.5 text-[#1F1410]/30" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search categories..."
                className="flex-1 text-sm bg-transparent outline-none text-[#1F1410] placeholder:text-[#1F1410]/30"
              />
            </div>
          </div>

          {/* Category list */}
          <div className="max-h-[200px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-[#1F1410]/40 text-center py-4">No categories found</p>
            ) : (
              filtered.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onSelect(cat)
                    setExpanded(false)
                    setSearch('')
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-[#1F1410]/[0.03] transition-colors ${
                    cat.id === selectedCategoryId ? 'bg-[#14B8A6]/5' : ''
                  }`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cat.color + '20' }}
                  >
                    <cat.icon className="w-3.5 h-3.5" style={{ color: cat.color }} />
                  </div>
                  <span className="text-sm text-[#1F1410] flex-1">{cat.name}</span>
                  {cat.id === selectedCategoryId && (
                    <Check className="w-3.5 h-3.5 text-[#14B8A6]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function MerchantRuleRow({
  rule,
  categoryName,
  categoryColor,
  CategoryIcon,
  onDelete,
}: {
  rule: MerchantRule
  categoryName: string
  categoryColor: string
  CategoryIcon: UICategory['icon'] | null
  onDelete: (id: string) => Promise<boolean>
}) {
  const [confirming, setConfirming] = useState(false)

  const matchTypeLabel = rule.match_type === 'starts_with' ? 'Starts with'
    : rule.match_type === 'exact' ? 'Exact'
    : 'Contains'

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1F1410]/[0.02] transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#1F1410] truncate">{rule.pattern}</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#1F1410]/5 text-[#1F1410]/50 flex-shrink-0">
              {matchTypeLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            {CategoryIcon && (
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: categoryColor + '20' }}
              >
                <CategoryIcon className="w-2.5 h-2.5" style={{ color: categoryColor }} />
              </div>
            )}
            <span className="text-xs text-[#1F1410]/50">{categoryName}</span>
          </div>
        </div>
      </div>
      <button
        onClick={async () => {
          if (!confirming) {
            setConfirming(true)
            setTimeout(() => setConfirming(false), 3000)
            return
          }
          await onDelete(rule.id)
        }}
        className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors flex-shrink-0 ${
          confirming
            ? 'bg-red-50 text-red-600 hover:bg-red-100'
            : 'text-[#1F1410]/30 hover:text-red-500 hover:bg-red-50'
        }`}
      >
        <Trash2 className="w-3 h-3" />
        {confirming ? 'Confirm?' : ''}
      </button>
    </div>
  )
}

export function ProfileView() {
  const { signOut } = useAuth()
  const { email, userId } = useUser()
  const { rules, createRule, deleteRule } = useMerchantRules()
  const { categories: dbCategories } = useCategories()

  // Linked accounts state
  const [linkedInstitutions, setLinkedInstitutions] = useState<{ id: string; institution_name: string | null; status: string; created_at: string; account_count: number }[]>([])

  const fetchLinkedInstitutions = useCallback(async () => {
    if (!userId) return
    const { data: plaidItems } = await supabase
      .from('plaid_items')
      .select('id, institution_name, status, created_at')
      .eq('user_id', userId)
    if (!plaidItems) return

    const { data: accounts } = await supabase
      .from('accounts')
      .select('plaid_item_id')
      .eq('user_id', userId)
      .eq('is_active', true)

    const countMap = new Map<string, number>()
    for (const a of accounts ?? []) {
      if (a.plaid_item_id) {
        countMap.set(a.plaid_item_id, (countMap.get(a.plaid_item_id) || 0) + 1)
      }
    }

    setLinkedInstitutions(plaidItems.map(item => ({
      ...item,
      account_count: countMap.get(item.id) || 0,
    })))
  }, [userId])

  useEffect(() => {
    fetchLinkedInstitutions()
  }, [fetchLinkedInstitutions])

  const allUiCategories = dbCategories.map(dbCategoryToUI)

  // Add rule form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPattern, setNewPattern] = useState('')
  const [newMatchType, setNewMatchType] = useState<MatchType>('contains')
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const resetForm = () => {
    setNewPattern('')
    setNewMatchType('contains')
    setNewCategoryId(null)
    setShowAddForm(false)
  }

  const handleSaveRule = async () => {
    if (!newPattern.trim() || !newCategoryId) return
    setSaving(true)
    try {
      await createRule(newPattern.trim(), newMatchType, newCategoryId)
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const findCategoryForRule = (categoryId: string) => {
    return allUiCategories.find(c => c.id === categoryId)
  }

  // Get initials from email
  const getInitials = (email: string | null) => {
    if (!email) return '?'
    const parts = email.split('@')[0].split(/[._-]/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.slice(0, 2).toUpperCase()
  }

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1F1410] mb-2">Settings</h1>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="bg-white rounded-2xl p-6 mb-6 border border-[#1F1410]/5"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(to bottom right, ${TAB_COLORS.profile}, #EC4899)` }}
            >
              <span className="text-xl font-bold text-white">{getInitials(email)}</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[#1F1410] truncate">{email || 'User'}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Mail className="w-3.5 h-3.5 text-[#1F1410]/30" />
                <span className="text-xs text-[#1F1410]/40">{email || 'Not available'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Linked Accounts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-[#1F1410]/5"
          >
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#14B8A6]" />
              </div>
              <h3 className="text-lg font-bold text-[#1F1410]">Linked Accounts</h3>
              {linkedInstitutions.length > 0 && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-[#14B8A6]/10 text-[#14B8A6]">
                  {linkedInstitutions.length}
                </span>
              )}
            </div>

            {linkedInstitutions.length === 0 ? (
              <div className="text-center py-6">
                <Building2 className="w-8 h-8 text-[#1F1410]/10 mx-auto mb-2" />
                <p className="text-sm text-[#1F1410]/40">
                  No linked accounts. Connect a bank from the Accounts page.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {linkedInstitutions.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1F1410]/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1F1410]/5 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-[#1F1410]/40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#1F1410]">{item.institution_name || 'Unknown Institution'}</p>
                        <p className="text-xs text-[#1F1410]/40">
                          {item.account_count} account{item.account_count !== 1 ? 's' : ''} · Connected {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      item.status === 'active'
                        ? 'bg-[#10B981]/10 text-[#10B981]'
                        : 'bg-[#F59E0B]/10 text-[#F59E0B]'
                    }`}>
                      {item.status === 'active' ? 'Connected' : item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Merchant Rules */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-[#1F1410]/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#14B8A6]/10 flex items-center justify-center">
                  <Wand2 className="w-4 h-4 text-[#14B8A6]" />
                </div>
                <h3 className="text-lg font-bold text-[#1F1410]">Merchant Rules</h3>
                {rules.length > 0 && (
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-[#14B8A6]/10 text-[#14B8A6]">
                    {rules.length}
                  </span>
                )}
              </div>
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#14B8A6] hover:bg-[#14B8A6]/5 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Rule
                </button>
              )}
            </div>

            {/* Add Rule Form */}
            {showAddForm && (
              <div className="mb-4 p-4 rounded-xl bg-[#1F1410]/[0.02] border border-[#1F1410]/5">
                {/* Pattern */}
                <div className="mb-3">
                  <label className="text-xs text-[#1F1410]/50 uppercase tracking-wide font-medium">Pattern</label>
                  <input
                    type="text"
                    value={newPattern}
                    onChange={e => setNewPattern(e.target.value)}
                    className="mt-1 w-full text-sm bg-white rounded-xl border border-[#1F1410]/10 px-4 py-2.5 outline-none focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6]/40 text-[#1F1410] transition-all"
                    placeholder="merchant name pattern"
                    autoFocus
                  />
                </div>

                {/* Match Type */}
                <div className="mb-3">
                  <label className="text-xs text-[#1F1410]/50 uppercase tracking-wide font-medium">Match Type</label>
                  <div className="flex gap-2 mt-1">
                    {(['contains', 'exact', 'starts_with'] as MatchType[]).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewMatchType(type)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          newMatchType === type
                            ? 'bg-[#14B8A6] text-white'
                            : 'bg-[#1F1410]/5 text-[#1F1410]/60 hover:bg-[#1F1410]/10'
                        }`}
                      >
                        {type === 'starts_with' ? 'Starts with' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="mb-4">
                  <label className="text-xs text-[#1F1410]/50 uppercase tracking-wide font-medium mb-1 block">Category</label>
                  <RuleCategoryPicker
                    categories={allUiCategories}
                    selectedCategoryId={newCategoryId}
                    onSelect={cat => setNewCategoryId(cat.id)}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={resetForm}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#1F1410]/50 hover:text-[#1F1410]/80 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    disabled={!newPattern.trim() || !newCategoryId || saving}
                    onClick={handleSaveRule}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-[#14B8A6] rounded-lg hover:bg-[#0D9488] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Rules List */}
            {rules.length === 0 ? (
              <div className="text-center py-6">
                <Wand2 className="w-8 h-8 text-[#1F1410]/10 mx-auto mb-2" />
                <p className="text-sm text-[#1F1410]/40">
                  No merchant rules yet. Create rules to auto-categorize transactions from specific merchants.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {rules.map(rule => {
                  const cat = findCategoryForRule(rule.category_id)
                  return (
                    <MerchantRuleRow
                      key={rule.id}
                      rule={rule}
                      categoryName={cat?.name || 'Unknown'}
                      categoryColor={cat?.color || '#999'}
                      CategoryIcon={cat?.icon || null}
                      onDelete={deleteRule}
                    />
                  )
                })}
              </div>
            )}
          </motion.div>

          {/* Sign Out */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="flex justify-start"
          >
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-[#1F1410]/40 hover:text-[#FF6B6B] hover:bg-[#FF6B6B]/5 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
