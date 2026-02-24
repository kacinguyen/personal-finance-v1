import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw,
  Link2,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { ACCOUNT_GROUP_COLORS, withOpacity } from '../../lib/colors'
import type { Account, AccountGroup } from '../../types/account'
import { ACCOUNT_TYPE_LABELS, ACCOUNT_GROUP_LABELS } from '../../types/account'
import type { PlaidItemPublic } from '../../types/plaidItem'
import { PlaidLinkButton } from '../common/PlaidLinkButton'
import { GROUP_ICONS, formatCurrency, formatCurrencyFull, formatRelativeTime } from '../views/AccountsView'

type AccountGroupCardProps = {
  group: AccountGroup
  accounts: Account[]
  plaidItems: PlaidItemPublic[]
  isExpanded: boolean
  syncingPlaidItemId: string | null
  groupIndex: number
  onToggle: () => void
  onSyncPlaidItem: (plaidItemId: string) => void
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  onPlaidSuccess: () => void
}

export function AccountGroupCard({
  group,
  accounts: accts,
  plaidItems,
  isExpanded,
  syncingPlaidItemId,
  groupIndex,
  onToggle,
  onSyncPlaidItem,
  onEdit,
  onDelete,
  onPlaidSuccess,
}: AccountGroupCardProps) {
  const GroupIcon = GROUP_ICONS[group]
  const groupColor = ACCOUNT_GROUP_COLORS[group]
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
      className="bg-white rounded-2xl overflow-hidden border border-[#1F1410]/5"
    >
      {/* Group Header */}
      <button
        onClick={onToggle}
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
                  onSuccess={onPlaidSuccess}
                  label="Re-connect"
                  className="!px-2.5 !py-1 !text-xs !bg-amber-500 hover:!bg-amber-600"
                />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  groupPlaidItems
                    .filter((pi) => pi.status === 'active')
                    .forEach((pi) => onSyncPlaidItem(pi.plaid_item_id))
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
                        onClick={() => onEdit(account)}
                        className="p-1.5 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
                        title="Edit account"
                      >
                        <Pencil className="w-3.5 h-3.5 text-[#1F1410]/30" />
                      </button>
                      <button
                        onClick={() => onDelete(account)}
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
}
