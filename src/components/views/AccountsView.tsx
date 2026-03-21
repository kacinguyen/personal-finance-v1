import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  RefreshCw,
  Wallet,
  CreditCard,
  TrendingUp,
  Building2,
  PiggyBank,
  Loader2,
  BanknoteIcon,
  ChevronDown,
  Link2,
  PencilLine,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useUser } from '../../hooks/useUser'
import { SHADOWS, CARD_CLASSES } from '../../lib/styles'
import { TAB_COLORS, withOpacity } from '../../lib/colors'
import { AddAccountModal } from '../modals/AddAccountModal'
import { usePlaidLink } from '../../hooks/usePlaidLink'
import { AccountSummaryCards } from '../accounts/AccountSummaryCards'
import { NetWorthChart } from '../accounts/NetWorthChart'
import { AccountGroupCard } from '../accounts/AccountGroupCard'
import type { PlaidItemPublic } from '../../types/plaidItem'
import type {
  Account,
  AccountType,
  AccountGroup,
  BalanceSnapshot,
  NetWorthDataPoint,
} from '../../types/account'
import {
  ACCOUNT_TYPE_TO_GROUP,
  isAssetType,
} from '../../types/account'
import { isDemoMode } from '../../lib/demo'

// --- Exported constants for sub-components ---

export const GROUP_ICONS: Record<AccountGroup, typeof Wallet> = {
  cash: Wallet,
  credit: CreditCard,
  investment: TrendingUp,
  loan: Building2,
  retirement: PiggyBank,
}

export const GROUP_ORDER: AccountGroup[] = ['cash', 'credit', 'investment', 'loan', 'retirement']

export type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL'

export const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: '1Y', value: '1Y' },
  { label: 'All', value: 'ALL' },
]

function getTimeRangeStartDate(range: TimeRange): Date | null {
  const now = new Date()
  switch (range) {
    case '1M':
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
    case '3M':
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
    case '6M':
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())
    case '1Y':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    case 'ALL':
      return null
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// --- Chart tooltip ---

export function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; dataKey: string; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="bg-white rounded-xl p-3 border border-[#1F1410]/10"
      style={{ boxShadow: SHADOWS.dropdown }}
    >
      <p className="text-xs text-[#1F1410]/50 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-semibold" style={{ color: entry.color }}>
          {entry.dataKey === 'netWorth'
            ? 'Net Worth'
            : entry.dataKey === 'assets'
              ? 'Assets'
              : 'Liabilities'}
          : {formatCurrencyFull(entry.value)}
        </p>
      ))}
    </div>
  )
}

// --- Compute net worth data points ---

function computeNetWorthData(
  snapshots: BalanceSnapshot[],
  accounts: Account[],
  startDate: Date | null,
): NetWorthDataPoint[] {
  if (snapshots.length === 0) return []

  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  // Determine date range
  const allDates = snapshots.map((s) => new Date(s.recorded_at).getTime())
  const minDate = startDate ? startDate.getTime() : Math.min(...allDates)
  const maxDate = Math.max(...allDates)

  // Generate bi-weekly bucket dates
  const buckets: number[] = []
  const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000
  let current = minDate
  while (current <= maxDate) {
    buckets.push(current)
    current += TWO_WEEKS
  }
  // Always include the latest date
  if (buckets[buckets.length - 1] < maxDate) {
    buckets.push(maxDate)
  }

  // Filter snapshots by date range
  const filtered = startDate
    ? snapshots.filter((s) => new Date(s.recorded_at).getTime() >= startDate.getTime())
    : snapshots

  // For each bucket, find the latest snapshot per account up to that date
  return buckets.map((bucketTime) => {
    const latestByAccount = new Map<string, number>()

    for (const snap of filtered) {
      const snapTime = new Date(snap.recorded_at).getTime()
      if (snapTime > bucketTime) continue

      const existing = latestByAccount.get(snap.account_id)
      if (existing === undefined) {
        latestByAccount.set(snap.account_id, snap.balance)
      } else {
        // Keep the latest one -- snapshots are not sorted, so compare
        const existingSnap = filtered.find(
          (s) => s.account_id === snap.account_id && s.balance === existing,
        )
        if (
          existingSnap &&
          new Date(snap.recorded_at).getTime() > new Date(existingSnap.recorded_at).getTime()
        ) {
          latestByAccount.set(snap.account_id, snap.balance)
        }
      }
    }

    let assets = 0
    let liabilities = 0

    for (const [accountId, balance] of latestByAccount) {
      const account = accountMap.get(accountId)
      if (!account) continue
      if (isAssetType(account.account_type)) {
        assets += balance
      } else {
        liabilities += balance
      }
    }

    return {
      date: new Date(bucketTime).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      assets: Math.round(assets * 100) / 100,
      liabilities: Math.round(liabilities * 100) / 100,
      netWorth: Math.round((assets - liabilities) * 100) / 100,
    }
  })
}

// --- Main component ---

export function AccountsView() {
  const { userId } = useUser()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('6M')
  const [expandedGroups, setExpandedGroups] = useState<Set<AccountGroup>>(
    new Set(GROUP_ORDER),
  )
  const [modalOpen, setModalOpen] = useState(false)
  const [editAccount, setEditAccount] = useState<Account | null>(null)
  const [plaidItems, setPlaidItems] = useState<PlaidItemPublic[]>([])
  const [showAddDropdown, setShowAddDropdown] = useState(false)

  // --- Data fetching ---

  const fetchAccounts = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching accounts:', error)
      return
    }
    setAccounts((data ?? []) as Account[])
  }, [userId])

  const fetchSnapshots = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('account_balance_history')
      .select('*')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: true })

    if (error) {
      console.error('Error fetching snapshots:', error)
      return
    }
    setSnapshots((data ?? []) as BalanceSnapshot[])
  }, [userId])

  const fetchPlaidItems = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('plaid_items')
      .select('id, user_id, plaid_item_id, institution_name, institution_id, status, created_at, updated_at')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching plaid items:', error)
      return
    }
    setPlaidItems((data ?? []) as PlaidItemPublic[])
  }, [userId])

  const { openLink: openPlaidLink, loading: plaidLinkLoading, error: plaidLinkError } = usePlaidLink({
    onSuccess: () => {
      fetchAccounts()
      fetchSnapshots()
      fetchPlaidItems()
    },
  })

  const syncPlaidItem = useCallback(async (plaidItemId: string) => {
    try {
      await Promise.all([
        supabase.functions.invoke('plaid-sync-accounts', {
          body: { plaid_item_id: plaidItemId },
        }),
        supabase.functions.invoke('plaid-sync-transactions', {
          body: { plaid_item_id: plaidItemId },
        }),
      ])
      await Promise.all([fetchAccounts(), fetchSnapshots()])
    } catch (err) {
      console.error('Error syncing plaid item:', err)
    }
  }, [fetchAccounts, fetchSnapshots])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    Promise.all([fetchAccounts(), fetchSnapshots(), fetchPlaidItems()]).finally(() => setLoading(false))
  }, [userId, fetchAccounts, fetchSnapshots, fetchPlaidItems])

  // --- Computed values ---

  const activeAccounts = useMemo(
    () => accounts.filter((a) => a.is_active),
    [accounts],
  )

  const totalAssets = useMemo(
    () =>
      activeAccounts
        .filter((a) => isAssetType(a.account_type))
        .reduce((sum, a) => sum + a.balance_current, 0),
    [activeAccounts],
  )

  const totalLiabilities = useMemo(
    () =>
      activeAccounts
        .filter((a) => !isAssetType(a.account_type))
        .reduce((sum, a) => sum + a.balance_current, 0),
    [activeAccounts],
  )

  const netWorth = totalAssets - totalLiabilities

  const groupedAccounts = useMemo(() => {
    const groups = new Map<AccountGroup, Account[]>()
    for (const group of GROUP_ORDER) {
      groups.set(group, [])
    }
    for (const account of activeAccounts) {
      const group = ACCOUNT_TYPE_TO_GROUP[account.account_type]
      groups.get(group)!.push(account)
    }
    return groups
  }, [activeAccounts])

  const chartData = useMemo(() => {
    const startDate = getTimeRangeStartDate(timeRange)
    return computeNetWorthData(snapshots, accounts, startDate)
  }, [snapshots, accounts, timeRange])

  // --- Actions ---

  const handleSave = async (data: {
    name: string
    institution_name: string | null
    account_type: AccountType
    balance_current: number
    mask: string | null
  }) => {
    if (!userId) return

    if (editAccount) {
      // Update existing account
      const { error } = await supabase
        .from('accounts')
        .update({
          name: data.name,
          institution_name: data.institution_name,
          account_type: data.account_type,
          balance_current: data.balance_current,
          mask: data.mask,
        })
        .eq('id', editAccount.id)

      if (error) throw new Error(error.message)
    } else {
      // Insert new account
      const { data: inserted, error } = await supabase
        .from('accounts')
        .insert({
          user_id: userId,
          name: data.name,
          institution_name: data.institution_name,
          account_type: data.account_type,
          balance_current: data.balance_current,
          mask: data.mask,
        })
        .select()
        .single()

      if (error) throw new Error(error.message)

      // Insert initial balance snapshot
      if (inserted) {
        const { error: snapError } = await supabase
          .from('account_balance_history')
          .insert({
            account_id: inserted.id,
            user_id: userId,
            balance: data.balance_current,
          })

        if (snapError) {
          console.error('Error creating initial snapshot:', snapError)
        }
      }
    }

    setEditAccount(null)
    await Promise.all([fetchAccounts(), fetchSnapshots()])
  }

  const handleDelete = async (account: Account) => {
    if (!confirm(`Delete "${account.name}"? This will hide the account.`)) return

    const { error } = await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('id', account.id)

    if (error) {
      console.error('Error deactivating account:', error)
      return
    }
    await fetchAccounts()
  }

  const handleSyncBalances = async () => {
    if (!userId || activeAccounts.length === 0) return
    setSyncing(true)

    // Snapshot manual account balances
    const manualAccounts = activeAccounts.filter((a) => a.is_manual)
    if (manualAccounts.length > 0) {
      const rows = manualAccounts.map((a) => ({
        account_id: a.id,
        user_id: userId,
        balance: a.balance_current,
      }))
      const { error } = await supabase.from('account_balance_history').insert(rows)
      if (error) console.error('Error syncing manual balances:', error)
    }

    // Sync Plaid-connected items
    const activePlaidItems = plaidItems.filter((pi) => pi.status === 'active')
    await Promise.all(
      activePlaidItems.map((pi) => syncPlaidItem(pi.plaid_item_id)),
    )

    await fetchSnapshots()
    setSyncing(false)
  }

  const toggleGroup = (group: AccountGroup) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#14B8A6]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#FFFBF5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <h1 className="text-2xl font-bold text-[#1F1410]">Accounts</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncBalances}
            disabled={syncing || activeAccounts.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[#1F1410]/60 border border-[#1F1410]/10 hover:bg-[#1F1410]/5 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Balances
          </button>
          <div className="relative">
            <button
              onClick={() => setShowAddDropdown(!showAddDropdown)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                showAddDropdown
                  ? 'text-[#14B8A6] bg-[#14B8A6]/10'
                  : 'text-[#1F1410]/60 hover:text-[#1F1410] hover:bg-[#1F1410]/5'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Add Account</span>
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            </button>

            {showAddDropdown && (
              <div
                className="absolute top-full right-0 mt-2 bg-white rounded-xl border border-[#1F1410]/10 shadow-lg z-50 min-w-[180px] overflow-hidden"
                onMouseLeave={() => setShowAddDropdown(false)}
              >
                <button
                  onClick={() => {
                    setEditAccount(null)
                    setModalOpen(true)
                    setShowAddDropdown(false)
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#1F1410]/5 transition-colors text-[#1F1410]"
                >
                  <PencilLine className="w-4 h-4 text-[#1F1410]/50" />
                  Manual Add
                </button>
                {!isDemoMode && (
                  <button
                    onClick={() => {
                      openPlaidLink()
                      setShowAddDropdown(false)
                    }}
                    disabled={plaidLinkLoading}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#1F1410]/5 transition-colors text-[#1F1410] disabled:opacity-60"
                  >
                    {plaidLinkLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#1F1410]/50" />
                    ) : (
                      <Link2 className="w-4 h-4 text-[#1F1410]/50" />
                    )}
                    Connect Bank
                  </button>
                )}
              </div>
            )}
            {plaidLinkError && (
              <p className="absolute top-full right-0 mt-1 text-xs text-red-500 max-w-[200px] text-right">{plaidLinkError}</p>
            )}
          </div>
        </div>
      </motion.div>

      {activeAccounts.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${CARD_CLASSES} border border-[#1F1410]/5`}
          style={{}}
        >
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: withOpacity(TAB_COLORS.accounts, 0.1) }}
            >
              <BanknoteIcon className="w-8 h-8" style={{ color: TAB_COLORS.accounts }} />
            </div>
            <h3 className="text-lg font-semibold text-[#1F1410] mb-2">No accounts yet</h3>
            <p className="text-sm text-[#1F1410]/50 max-w-sm mb-6">
              Add your bank accounts, credit cards, investments, and loans to track your net worth
              over time.
            </p>
            <button
              onClick={() => {
                setEditAccount(null)
                setModalOpen(true)
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-colors"
              style={{ backgroundColor: TAB_COLORS.accounts }}
            >
              <Plus className="w-4 h-4" />
              Add Your First Account
            </button>
          </div>
        </motion.div>
      ) : (
        <>
          {/* Summary Cards */}
          <AccountSummaryCards
            netWorth={netWorth}
            totalAssets={totalAssets}
            totalLiabilities={totalLiabilities}
          />

          {/* Net Worth Chart */}
          <NetWorthChart
            chartData={chartData}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />

          {/* Account Groups */}
          <div className="space-y-4">
            {GROUP_ORDER.map((group, groupIndex) => {
              const accts = groupedAccounts.get(group) ?? []
              if (accts.length === 0) return null

              return (
                <AccountGroupCard
                  key={group}
                  group={group}
                  accounts={accts}
                  plaidItems={plaidItems}
                  isExpanded={expandedGroups.has(group)}
                  groupIndex={groupIndex}
                  onToggle={() => toggleGroup(group)}
                  onEdit={(account) => {
                    setEditAccount(account)
                    setModalOpen(true)
                  }}
                  onDelete={handleDelete}
                  onPlaidSuccess={() => {
                    fetchAccounts()
                    fetchSnapshots()
                    fetchPlaidItems()
                  }}
                />
              )
            })}
          </div>
        </>
      )}

      {/* Add/Edit Account Modal */}
      <AddAccountModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditAccount(null)
        }}
        onSave={handleSave}
        editAccount={editAccount}
      />
      </div>
    </div>
  )
}
