import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, Check, Landmark } from 'lucide-react'
import { INPUT_CLASSES } from '../lib/styles'
import type { Account, AccountType } from '../types/account'
import { ACCOUNT_TYPE_LABELS } from '../types/account'

type AddAccountModalProps = {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    name: string
    institution_name: string | null
    account_type: AccountType
    balance_current: number
    mask: string | null
  }) => Promise<void>
  editAccount?: Account | null
}

const ACCOUNT_TYPES = Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]

export function AddAccountModal({ isOpen, onClose, onSave, editAccount }: AddAccountModalProps) {
  const [name, setName] = useState('')
  const [institution, setInstitution] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('checking')
  const [balance, setBalance] = useState('')
  const [mask, setMask] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editAccount) {
      setName(editAccount.name)
      setInstitution(editAccount.institution_name ?? '')
      setAccountType(editAccount.account_type)
      setBalance(String(editAccount.balance_current))
      setMask(editAccount.mask ?? '')
    } else {
      setName('')
      setInstitution('')
      setAccountType('checking')
      setBalance('')
      setMask('')
    }
    setError(null)
  }, [editAccount, isOpen])

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Account name is required')
      return
    }
    const parsed = parseFloat(balance)
    if (balance && isNaN(parsed)) {
      setError('Balance must be a valid number')
      return
    }
    setIsSaving(true)
    setError(null)
    try {
      await onSave({
        name: name.trim(),
        institution_name: institution.trim() || null,
        account_type: accountType,
        balance_current: balance ? parsed : 0,
        mask: mask.trim() || null,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save account')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1F1410]/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#1F1410]/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/10 flex items-center justify-center">
                  <Landmark className="w-5 h-5 text-[#14B8A6]" />
                </div>
                <h2 className="text-lg font-bold text-[#1F1410]">
                  {editAccount ? 'Edit Account' : 'Add Account'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[#1F1410]/5 transition-colors"
              >
                <X className="w-5 h-5 text-[#1F1410]/40" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Account Name */}
              <div>
                <label className="block text-sm font-medium text-[#1F1410]/60 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Chase Checking"
                  className={`${INPUT_CLASSES} w-full`}
                />
              </div>

              {/* Institution */}
              <div>
                <label className="block text-sm font-medium text-[#1F1410]/60 mb-1">
                  Institution
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Chase, Fidelity"
                  className={`${INPUT_CLASSES} w-full`}
                />
              </div>

              {/* Account Type */}
              <div>
                <label className="block text-sm font-medium text-[#1F1410]/60 mb-1">
                  Account Type
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className={`${INPUT_CLASSES} w-full`}
                >
                  {ACCOUNT_TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Balance */}
              <div>
                <label className="block text-sm font-medium text-[#1F1410]/60 mb-1">
                  Current Balance
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#1F1410]/40 text-sm">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={balance}
                    onChange={(e) => {
                      const v = e.target.value
                      if (v === '' || /^-?\d*\.?\d{0,2}$/.test(v)) {
                        setBalance(v)
                      }
                    }}
                    placeholder="0.00"
                    className={`${INPUT_CLASSES} w-full pl-7`}
                  />
                </div>
              </div>

              {/* Last 4 Digits */}
              <div>
                <label className="block text-sm font-medium text-[#1F1410]/60 mb-1">
                  Last 4 Digits
                </label>
                <input
                  type="text"
                  value={mask}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setMask(v)
                  }}
                  placeholder="1234"
                  maxLength={4}
                  className={`${INPUT_CLASSES} w-full`}
                />
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#1F1410]/10">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#1F1410]/60 hover:bg-[#1F1410]/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-[#14B8A6] hover:bg-[#14B8A6]/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {isSaving ? 'Saving...' : editAccount ? 'Update' : 'Add Account'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
