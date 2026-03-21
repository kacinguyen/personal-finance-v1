import { motion, AnimatePresence } from 'framer-motion'
import {
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
import { GROUP_ICONS, formatCurrencyFull, formatRelativeTime } from '../views/AccountsView'

type AccountGroupCardProps = {
  group: AccountGroup
  accounts: Account[]
  plaidItems: PlaidItemPublic[]
  isExpanded: boolean
  groupIndex: number
  onToggle: () => void
  onEdit: (account: Account) => void
  onDelete: (account: Account) => void
  onPlaidSuccess: () => void
}

export function AccountGroupCard({
  group,
  accounts: accts,
  plaidItems,
  isExpanded,
  groupIndex,
  onToggle,
  onEdit,
  onDelete,
  onPlaidSuccess,
}: AccountGroupCardProps) {
  const GroupIcon = GROUP_ICONS[group]
  const groupColor = ACCOUNT_GROUP_COLORS[group]

  return (
    <motion.div
      key={group}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 + groupIndex * 0.05 }}
      className="bg-white rounded-2xl overflow-hidden border border-[#1F1410]/5"
    >
      {/* Group Header */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
        className="w-full flex items-center justify-between p-5 hover:bg-[#1F1410]/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: withOpacity(groupColor, 0.1) }}
          >
            <GroupIcon className="w-5 h-5" style={{ color: groupColor }} />
          </div>
          <h3 className="text-sm font-semibold text-[#1F1410]">
            {ACCOUNT_GROUP_LABELS[group]}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-[#1F1410]/40">
            {accts.length} account{accts.length !== 1 ? 's' : ''}
          </span>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-[#1F1410]/30" />
          ) : (
            <ChevronRight className="w-5 h-5 text-[#1F1410]/30" />
          )}
        </div>
      </div>

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
                      {!account.is_manual && plaidItems.find(
                        (pi) => pi.plaid_item_id === account.plaid_item_id && pi.status === 'error'
                      ) && (
                        <PlaidLinkButton
                          plaidItemId={account.plaid_item_id!}
                          onSuccess={onPlaidSuccess}
                          label="Re-connect"
                          className="!px-2.5 !py-1 !text-xs !bg-amber-500 hover:!bg-amber-600"
                        />
                      )}
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
