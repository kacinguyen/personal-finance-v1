// Account types matching the database schema

export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'investment'
  | 'loan'
  | 'mortgage'
  | 'retirement_401k'
  | 'retirement_ira'

export type AccountGroup = 'cash' | 'credit' | 'investment' | 'loan' | 'retirement'

export type Account = {
  id: string
  user_id: string
  name: string
  institution_name: string | null
  account_type: AccountType
  subtype: string | null
  mask: string | null
  balance_current: number
  balance_available: number | null
  currency: string
  plaid_account_id: string | null
  plaid_item_id: string | null
  is_manual: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AccountInsert = {
  user_id: string
  name: string
  institution_name?: string | null
  account_type: AccountType
  subtype?: string | null
  mask?: string | null
  balance_current: number
  balance_available?: number | null
  currency?: string
  plaid_account_id?: string | null
  plaid_item_id?: string | null
  is_manual?: boolean
  is_active?: boolean
}

export type AccountUpdate = Partial<Omit<AccountInsert, 'user_id'>>

export type BalanceSnapshot = {
  id: string
  account_id: string
  user_id: string
  balance: number
  recorded_at: string
}

export type NetWorthDataPoint = {
  date: string
  assets: number
  liabilities: number
  netWorth: number
}

// --- Lookup maps ---

export const ACCOUNT_TYPE_TO_GROUP: Record<AccountType, AccountGroup> = {
  checking: 'cash',
  savings: 'cash',
  credit_card: 'credit',
  investment: 'investment',
  loan: 'loan',
  mortgage: 'loan',
  retirement_401k: 'retirement',
  retirement_ira: 'retirement',
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  investment: 'Investment',
  loan: 'Loan',
  mortgage: 'Mortgage',
  retirement_401k: '401(k)',
  retirement_ira: 'IRA',
}

export const ACCOUNT_GROUP_LABELS: Record<AccountGroup, string> = {
  cash: 'Cash',
  credit: 'Credit Cards',
  investment: 'Investments',
  loan: 'Loans',
  retirement: 'Retirement',
}

// --- Helpers ---

const ASSET_TYPES: Set<AccountType> = new Set([
  'checking',
  'savings',
  'investment',
  'retirement_401k',
  'retirement_ira',
])

const LIABILITY_TYPES: Set<AccountType> = new Set([
  'credit_card',
  'loan',
  'mortgage',
])

export function isAssetType(type: AccountType): boolean {
  return ASSET_TYPES.has(type)
}

export function isLiabilityType(type: AccountType): boolean {
  return LIABILITY_TYPES.has(type)
}
