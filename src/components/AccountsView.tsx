import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Landmark,
  Plus,
  RefreshCw,
  Link2,
  Wallet,
  CreditCard,
  TrendingUp,
  Building2,
  PiggyBank,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Loader2,
  BanknoteIcon,
  AlertTriangle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useUser } from '../hooks/useUser'
import { SHADOWS, CARD_CLASSES } from '../lib/styles'
import { TAB_COLORS, ACCOUNT_GROUP_COLORS, withOpacity } from '../lib/colors'
import { AddAccountModal } from './AddAccountModal'
import { PlaidLinkButton } from './PlaidLinkButton'
import type { PlaidItemPublic } from '../types/plaidItem'
import type {
  Account,
  AccountType,
  AccountGroup,
  BalanceSnapshot,
  NetWorthDataPoint,
} from '../types/account'
import {
  ACCOUNT_TYPE_TO_GROUP,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_GROUP_LABELS,
  isAssetType,
} from '../types/account'

// --- Constants ---

const GROUP_ICONS: Record<AccountGroup, typeof Wallet> = {
  cash: Wallet,
  credit: CreditCard,
  investment: TrendingUp,
  loan: Building2,
  retirement: PiggyBank,
}

const GROUP_ORDER: AccountGroup[] = ['cash', 'credit', 'investment', 'loan', 'retirement']

type TimeRange = '1M' | '3M' | '6M' | '1Y' | 'ALL'

const TIME_RANGES: { label: string; value: TimeRange }[] = [
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatRelativeTime(dateStr: string): string {
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

function ChartTooltip({ active, payload, label }: {
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
  const [syncingPlaidItemId, setSyncingPlaidItemId] = useState<string | null>(null)

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

  const syncPlaidItem = useCallback(async (plaidItemId: string) => {
    setSyncingPlaidItemId(plaidItemId)
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
    } finally {
      setSyncingPlaidItemId(null)
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
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: withOpacity(TAB_COLORS.accounts, 0.1) }}
          >
            <Landmark className="w-6 h-6" style={{ color: TAB_COLORS.accounts }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1F1410]">Accounts</h1>
            <p className="text-sm text-[#1F1410]/50">
              {activeAccounts.length} account{activeAccounts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncBalances}
            disabled={syncing || activeAccounts.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium text-[#1F1410]/60 border border-[#1F1410]/10 hover:bg-[#1F1410]/5 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            Sync Balances
          </button>
          <PlaidLinkButton
            onSuccess={() => {
              fetchAccounts()
              fetchSnapshots()
              fetchPlaidItems()
            }}
          />
          <button
            onClick={() => {
              setEditAccount(null)
              setModalOpen(true)
            }}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-colors"
            style={{ backgroundColor: TAB_COLORS.accounts }}
          >
            <Plus className="w-4 h-4" />
            Add Account
          </button>
        </div>
      </motion.div>

      {activeAccounts.length === 0 ? (
        /* Empty state */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={CARD_CLASSES}
          style={{ boxShadow: SHADOWS.card }}
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
          {/* Summary Cards — 2-column layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
          >
            {/* Left: Net Worth + Assets/Liabilities totals */}
            <div
              className="bg-white rounded-2xl p-6"
              style={{ boxShadow: SHADOWS.card }}
            >
              <p className="text-sm font-medium text-[#1F1410]/50 mb-1">Net Worth</p>
              <p
                className="text-3xl font-bold mb-4"
                style={{ color: TAB_COLORS.accounts }}
              >
                {formatCurrency(netWorth)}
              </p>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs font-medium text-[#1F1410]/40">Assets</p>
                  <p className="text-lg font-semibold text-[#10B981]">
                    {formatCurrency(totalAssets)}
                  </p>
                </div>
                <div className="w-px h-8 bg-[#1F1410]/10" />
                <div>
                  <p className="text-xs font-medium text-[#1F1410]/40">Liabilities</p>
                  <p className="text-lg font-semibold text-[#EF4444]">
                    {formatCurrency(totalLiabilities)}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Breakdown split by Assets / Liabilities */}
            <div
              className="bg-white rounded-2xl p-6"
              style={{ boxShadow: SHADOWS.card }}
            >
              {/* Assets section */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#10B981]">Assets</p>
                  <p className="text-sm font-bold text-[#10B981]">{formatCurrency(totalAssets)}</p>
                </div>
                {totalAssets > 0 && (
                  <div className="flex rounded-lg overflow-hidden h-2.5 mb-3">
                    {GROUP_ORDER.filter((g) => {
                      const accts = groupedAccounts.get(g) ?? []
                      return accts.length > 0 && accts.every((a) => isAssetType(a.account_type))
                    }).map((group) => {
                      const accts = groupedAccounts.get(group) ?? []
                      const groupTotal = accts.reduce((sum, a) => sum + a.balance_current, 0)
                      const pct = (groupTotal / totalAssets) * 100
                      return (
                        <div
                          key={group}
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: ACCOUNT_GROUP_COLORS[group],
                            minWidth: pct > 0 ? '4px' : 0,
                          }}
                        />
                      )
                    })}
                  </div>
                )}
                <div className="space-y-1.5">
                  {GROUP_ORDER.map((group) => {
                    const accts = groupedAccounts.get(group) ?? []
                    if (accts.length === 0 || !accts.every((a) => isAssetType(a.account_type))) return null
                    const groupTotal = accts.reduce((sum, a) => sum + a.balance_current, 0)
                    return (
                      <div key={group} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: ACCOUNT_GROUP_COLORS[group] }}
                          />
                          <span className="text-xs text-[#1F1410]/60">{ACCOUNT_GROUP_LABELS[group]}</span>
                        </div>
                        <span className="text-xs font-semibold text-[#1F1410]">{formatCurrency(groupTotal)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#1F1410]/5 mb-5" />

              {/* Liabilities section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-[#EF4444]">Liabilities</p>
                  <p className="text-sm font-bold text-[#EF4444]">{formatCurrency(totalLiabilities)}</p>
                </div>
                {totalLiabilities > 0 && (
                  <div className="flex rounded-lg overflow-hidden h-2.5 mb-3">
                    {GROUP_ORDER.filter((g) => {
                      const accts = groupedAccounts.get(g) ?? []
                      return accts.length > 0 && accts.every((a) => !isAssetType(a.account_type))
                    }).map((group) => {
                      const accts = groupedAccounts.get(group) ?? []
                      const groupTotal = accts.reduce((sum, a) => sum + a.balance_current, 0)
                      const pct = (groupTotal / totalLiabilities) * 100
                      return (
                        <div
                          key={group}
                          className="h-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: ACCOUNT_GROUP_COLORS[group],
                            minWidth: pct > 0 ? '4px' : 0,
                          }}
                        />
                      )
                    })}
                  </div>
                )}
                <div className="space-y-1.5">
                  {GROUP_ORDER.map((group) => {
                    const accts = groupedAccounts.get(group) ?? []
                    if (accts.length === 0 || !accts.every((a) => !isAssetType(a.account_type))) return null
                    const groupTotal = accts.reduce((sum, a) => sum + a.balance_current, 0)
                    return (
                      <div key={group} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: ACCOUNT_GROUP_COLORS[group] }}
                          />
                          <span className="text-xs text-[#1F1410]/60">{ACCOUNT_GROUP_LABELS[group]}</span>
                        </div>
                        <span className="text-xs font-semibold text-[#1F1410]">{formatCurrency(groupTotal)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Net Worth Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl p-6 mb-8"
            style={{ boxShadow: SHADOWS.card }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#1F1410]">Net Worth</h2>
              <div className="flex items-center gap-1 bg-[#1F1410]/5 rounded-lg p-1">
                {TIME_RANGES.map((tr) => (
                  <button
                    key={tr.value}
                    onClick={() => setTimeRange(tr.value)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      timeRange === tr.value
                        ? 'bg-white text-[#1F1410] shadow-sm'
                        : 'text-[#1F1410]/50 hover:text-[#1F1410]/70'
                    }`}
                  >
                    {tr.label}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TAB_COLORS.accounts} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={TAB_COLORS.accounts} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(31,20,16,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'rgba(31,20,16,0.4)' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'rgba(31,20,16,0.4)' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => formatCurrency(v)}
                    width={80}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    stroke={TAB_COLORS.accounts}
                    strokeWidth={2}
                    fill="url(#netWorthGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-sm text-[#1F1410]/40">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No chart data yet.</p>
                  <p className="text-xs mt-1">
                    Click &ldquo;Sync Balances&rdquo; to start tracking your net worth.
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Account Groups */}
          <div className="space-y-4">
            {GROUP_ORDER.map((group, groupIndex) => {
              const accts = groupedAccounts.get(group) ?? []
              if (accts.length === 0) return null

              const GroupIcon = GROUP_ICONS[group]
              const groupColor = ACCOUNT_GROUP_COLORS[group]
              const isExpanded = expandedGroups.has(group)
              const groupTotal = accts.reduce((sum, a) => sum + a.balance_current, 0)

              // Find Plaid items connected to accounts in this group
              const groupPlaidItemIds = new Set(
                accts.filter((a) => !a.is_manual && a.plaid_item_id).map((a) => a.plaid_item_id),
              )
              const groupPlaidItems = plaidItems.filter((pi) => groupPlaidItemIds.has(pi.plaid_item_id))
              const hasPlaidAccounts = groupPlaidItems.length > 0
              const hasErrorItem = groupPlaidItems.some((pi) => pi.status === 'error')
              const errorItem = groupPlaidItems.find((pi) => pi.status === 'error')

              return (
                <motion.div
                  key={group}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + groupIndex * 0.05 }}
                  className="bg-white rounded-2xl overflow-hidden"
                  style={{ boxShadow: SHADOWS.card }}
                >
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group)}
                    className="w-full flex items-center justify-between p-5 hover:bg-[#1F1410]/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: withOpacity(groupColor, 0.1) }}
                      >
                        <GroupIcon className="w-5 h-5" style={{ color: groupColor }} />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-semibold text-[#1F1410]">
                          {ACCOUNT_GROUP_LABELS[group]}
                        </h3>
                        <p className="text-xs text-[#1F1410]/40">
                          {accts.length} account{accts.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {hasPlaidAccounts && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {hasErrorItem && errorItem && (
                            <PlaidLinkButton
                              accessToken={errorItem.plaid_item_id}
                              onSuccess={() => {
                                fetchAccounts()
                                fetchSnapshots()
                                fetchPlaidItems()
                              }}
                              label="Re-connect"
                              className="!px-2.5 !py-1 !text-xs !bg-amber-500 hover:!bg-amber-600"
                            />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              groupPlaidItems
                                .filter((pi) => pi.status === 'active')
                                .forEach((pi) => syncPlaidItem(pi.plaid_item_id))
                            }}
                            disabled={syncingPlaidItemId !== null}
                            className="p-1.5 rounded-lg hover:bg-[#1F1410]/5 transition-colors disabled:opacity-50"
                            title="Sync linked accounts"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 text-[#14B8A6] ${
                              groupPlaidItems.some((pi) => syncingPlaidItemId === pi.plaid_item_id) ? 'animate-spin' : ''
                            }`} />
                          </button>
                        </div>
                      )}
                      <span className="text-lg font-bold" style={{ color: groupColor }}>
                        {formatCurrency(groupTotal)}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-[#1F1410]/30" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-[#1F1410]/30" />
                      )}
                    </div>
                  </button>

                  {/* Account List */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[#1F1410]/5">
                          {accts.map((account, i) => (
                            <motion.div
                              key={account.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className={`flex items-center justify-between px-5 py-3.5 ${
                                i < accts.length - 1 ? 'border-b border-[#1F1410]/5' : ''
                              } hover:bg-[#1F1410]/[0.02] transition-colors`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#1F1410] truncate flex items-center gap-1.5">
                                    {account.name}
                                    {account.mask && (
                                      <span className="text-[#1F1410]/30">
                                        ···{account.mask}
                                      </span>
                                    )}
                                    {!account.is_manual && (
                                      <span title="Linked via Plaid"><Link2 className="w-3 h-3 text-[#14B8A6] flex-shrink-0" /></span>
                                    )}
                                    {!account.is_manual && plaidItems.find(
                                      (pi) => pi.plaid_item_id === account.plaid_item_id && pi.status === 'error'
                                    ) && (
                                      <span title="Re-authentication required"><AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" /></span>
                                    )}
                                  </p>
                                  <p className="text-xs text-[#1F1410]/40 truncate">
                                    {account.institution_name
                                      ? `${account.institution_name} · `
                                      : ''}
                                    {ACCOUNT_TYPE_LABELS[account.account_type]}
                                    {!account.is_manual && account.updated_at && (
                                      <span className="text-[#1F1410]/25"> · Synced {formatRelativeTime(account.updated_at)}</span>
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-[#1F1410]">
                                  {formatCurrencyFull(account.balance_current)}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditAccount(account)
                                      setModalOpen(true)
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
                                    title="Edit account"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-[#1F1410]/30" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(account)}
                                    className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                    title="Delete account"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-[#1F1410]/30 hover:text-red-400" />
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
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
  )
}
