import { motion } from 'framer-motion'
import { SHADOWS } from '../../lib/styles'
import { TAB_COLORS, ACCOUNT_GROUP_COLORS } from '../../lib/colors'
import type { Account, AccountGroup } from '../../types/account'
import { ACCOUNT_GROUP_LABELS, isAssetType } from '../../types/account'
import { GROUP_ORDER, formatCurrency } from '../views/AccountsView'

type AccountSummaryCardsProps = {
  netWorth: number
  totalAssets: number
  totalLiabilities: number
  groupedAccounts: Map<AccountGroup, Account[]>
}

export function AccountSummaryCards({
  netWorth,
  totalAssets,
  totalLiabilities,
  groupedAccounts,
}: AccountSummaryCardsProps) {
  return (
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
  )
}
