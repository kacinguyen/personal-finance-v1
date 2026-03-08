import type { SupabaseClient } from '@supabase/supabase-js'

export type AccountGroup = 'cash' | 'credit' | 'investment' | 'loan' | 'retirement'
export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'loan' | 'mortgage' | 'retirement_401k' | 'retirement_ira'

const ACCOUNT_TYPE_TO_GROUP: Record<AccountType, AccountGroup> = {
  checking: 'cash',
  savings: 'cash',
  credit_card: 'credit',
  investment: 'investment',
  loan: 'loan',
  mortgage: 'loan',
  retirement_401k: 'retirement',
  retirement_ira: 'retirement',
}

function isAssetType(type: AccountType): boolean {
  return ['checking', 'savings', 'investment', 'retirement_401k', 'retirement_ira'].includes(type)
}

function isLiabilityType(type: AccountType): boolean {
  return ['credit_card', 'loan', 'mortgage'].includes(type)
}

export type FinancialSnapshot = {
  currentMonth: {
    income: { total: number; salary: number; other: number }
    spending: { total: number; needs: number; wants: number; savingsFunded: number }
    netSavings: number
    daysRemaining: number
    budgetUtilization: { needsPct: number; wantsPct: number; totalPct: number }
  }
  averages: {
    threeMonth: { income: number; spending: number; needs: number; wants: number; netSavings: number }
    sixMonth: { income: number; spending: number; needs: number; wants: number; netSavings: number }
  }
  accounts: {
    netWorth: number
    totalAssets: number
    totalLiabilities: number
    groups: {
      group: AccountGroup
      accounts: { name: string; type: AccountType; balance: number }[]
    }[]
  }
  goals: {
    name: string; goalType: string; currentAmount: number; targetAmount: number
    percentComplete: number; priority: number; isOnTrack: boolean
  }[]
  paycheck: {
    latestGross: number; latestNet: number; avgGross: number; avgNet: number
    monthly401k: number; monthlyEmployerMatch: number; monthlyHSA: number; monthlyESPP: number
    effectiveTaxRate: number
  }
  budgets: {
    categoryName: string; budgetType: string; limit: number; spent: number; remaining: number
  }[]
  upcomingRsuVests: { vestDate: string; shares: number; estimatedValue: number }[]
}

function getMonthKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function getTrailingMonthKeys(count: number): string[] {
  const now = new Date()
  const keys: string[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(getMonthKey(d))
  }
  return keys
}

function getDaysRemainingInMonth(): number {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return lastDay - now.getDate()
}

function computeAverages(summaries: any[], count: number) {
  // Skip current month (index 0), average the trailing months
  const trailing = summaries.slice(1, count + 1)
  if (trailing.length === 0) {
    return { income: 0, spending: 0, needs: 0, wants: 0, netSavings: 0 }
  }
  const n = trailing.length
  return {
    income: trailing.reduce((s: number, r: any) => s + (r.total_income || 0), 0) / n,
    spending: trailing.reduce((s: number, r: any) => s + (r.total_spending || 0), 0) / n,
    needs: trailing.reduce((s: number, r: any) => s + (r.needs_spending || 0), 0) / n,
    wants: trailing.reduce((s: number, r: any) => s + (r.wants_spending || 0), 0) / n,
    netSavings: trailing.reduce((s: number, r: any) => s + (r.net_savings || 0), 0) / n,
  }
}

export async function buildFinancialSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<FinancialSnapshot> {
  const monthKeys = getTrailingMonthKeys(7) // current + 6 trailing
  const currentMonthKey = monthKeys[0]
  const today = new Date().toISOString().split('T')[0]

  const [
    summariesRes,
    accountsRes,
    goalsRes,
    paystubsRes,
    rsusRes,
    budgetsRes,
  ] = await Promise.all([
    supabase
      .from('monthly_summaries')
      .select('*')
      .eq('user_id', userId)
      .in('month', monthKeys)
      .order('month', { ascending: false }),
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('priority', { ascending: true }),
    supabase
      .from('paystubs')
      .select('*')
      .eq('user_id', userId)
      .order('pay_date', { ascending: false })
      .limit(6),
    supabase
      .from('rsu_vests')
      .select('*')
      .eq('user_id', userId)
      .gte('vest_date', today)
      .order('vest_date', { ascending: true })
      .limit(5),
    supabase
      .from('budgets')
      .select('*, categories(name)')
      .eq('user_id', userId)
      .eq('is_active', true),
  ])

  const summaries = summariesRes.data || []
  const accounts = accountsRes.data || []
  const goals = goalsRes.data || []
  const paystubs = paystubsRes.data || []
  const rsus = rsusRes.data || []
  const budgetRows = budgetsRes.data || []

  // Current month summary
  const current = summaries.find((s: any) => s.month === currentMonthKey) || {} as any

  // Budget utilization
  const needsBudget = current.needs_budget || 1
  const wantsBudget = current.wants_budget || 1
  const totalBudget = current.total_budget || 1

  // Accounts grouping
  const totalAssets = accounts
    .filter((a: any) => isAssetType(a.account_type))
    .reduce((s: number, a: any) => s + (a.balance || 0), 0)
  const totalLiabilities = accounts
    .filter((a: any) => isLiabilityType(a.account_type))
    .reduce((s: number, a: any) => s + Math.abs(a.balance || 0), 0)

  const groupMap = new Map<AccountGroup, { name: string; type: AccountType; balance: number }[]>()
  for (const a of accounts) {
    const group = ACCOUNT_TYPE_TO_GROUP[a.account_type as AccountType] || 'cash'
    if (!groupMap.has(group)) groupMap.set(group, [])
    groupMap.get(group)!.push({
      name: a.name,
      type: a.account_type,
      balance: a.balance || 0,
    })
  }

  // Paystub averages
  const avgGross = paystubs.length > 0
    ? paystubs.reduce((s: number, p: any) => s + (p.gross_pay || 0), 0) / paystubs.length
    : 0
  const avgNet = paystubs.length > 0
    ? paystubs.reduce((s: number, p: any) => s + (p.net_pay || 0), 0) / paystubs.length
    : 0
  const latest = paystubs[0] || {} as any
  const totalTaxes = (latest.federal_income_tax || 0) + (latest.state_income_tax || 0) +
    (latest.social_security_tax || 0) + (latest.medicare_tax || 0) +
    (latest.local_tax || 0) + (latest.state_disability_insurance || 0) + (latest.other_taxes || 0)
  const effectiveTaxRate = latest.gross_pay ? totalTaxes / latest.gross_pay : 0

  // Monthly category spending for budgets
  const monthlyCatRes = await supabase
    .from('monthly_category_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('month', currentMonthKey)

  const monthlyCats = monthlyCatRes.data || []
  const catSpendMap = new Map<string, number>()
  for (const mc of monthlyCats) {
    catSpendMap.set(mc.category_id, mc.total_spending || 0)
  }

  const budgets = budgetRows.map((b: any) => ({
    categoryName: b.categories?.name || b.category || 'Unknown',
    budgetType: b.budget_type || 'want',
    limit: b.monthly_limit || 0,
    spent: catSpendMap.get(b.category_id) || 0,
    remaining: (b.monthly_limit || 0) - (catSpendMap.get(b.category_id) || 0),
  }))

  return {
    currentMonth: {
      income: {
        total: current.total_income || 0,
        salary: current.salary_income || 0,
        other: (current.total_income || 0) - (current.salary_income || 0),
      },
      spending: {
        total: current.total_spending || 0,
        needs: current.needs_spending || 0,
        wants: current.wants_spending || 0,
        savingsFunded: current.savings_funded_spending || 0,
      },
      netSavings: current.net_savings || 0,
      daysRemaining: getDaysRemainingInMonth(),
      budgetUtilization: {
        needsPct: Math.round(((current.needs_spending || 0) / needsBudget) * 100),
        wantsPct: Math.round(((current.wants_spending || 0) / wantsBudget) * 100),
        totalPct: Math.round(((current.total_spending || 0) / totalBudget) * 100),
      },
    },
    averages: {
      threeMonth: computeAverages(summaries, 3),
      sixMonth: computeAverages(summaries, 6),
    },
    accounts: {
      netWorth: totalAssets - totalLiabilities,
      totalAssets,
      totalLiabilities,
      groups: Array.from(groupMap.entries()).map(([group, accts]) => ({
        group,
        accounts: accts,
      })),
    },
    goals: goals.map((g: any) => {
      const pct = g.target_amount > 0
        ? Math.round((g.current_amount / g.target_amount) * 100)
        : 0
      return {
        name: g.name,
        goalType: g.goal_type,
        currentAmount: g.current_amount || 0,
        targetAmount: g.target_amount || 0,
        percentComplete: pct,
        priority: g.priority || 99,
        isOnTrack: pct >= 50, // Simplified heuristic
      }
    }),
    paycheck: {
      latestGross: latest.gross_pay || 0,
      latestNet: latest.net_pay || 0,
      avgGross,
      avgNet,
      monthly401k: (latest.traditional_401k || 0) + (latest.roth_401k || 0) + (latest.after_tax_401k || 0),
      monthlyEmployerMatch: latest.employer_401k_match || 0,
      monthlyHSA: latest.hsa_contribution || 0,
      monthlyESPP: latest.espp_contribution || 0,
      effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
    },
    budgets,
    upcomingRsuVests: rsus.map((r: any) => ({
      vestDate: r.vest_date,
      shares: r.shares_vested || 0,
      estimatedValue: r.total_gross_value || 0,
    })),
  }
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) {
    return `$${(n / 1000).toFixed(1)}k`
  }
  return `$${Math.round(n)}`
}

export function serializeSnapshot(s: FinancialSnapshot): string {
  const lines: string[] = []

  lines.push('=== FINANCIAL SNAPSHOT ===')
  lines.push('')

  // Current month
  lines.push(`## This Month (${s.currentMonth.daysRemaining} days remaining)`)
  lines.push(`Income: ${fmt(s.currentMonth.income.total)} (salary ${fmt(s.currentMonth.income.salary)}, other ${fmt(s.currentMonth.income.other)})`)
  lines.push(`Spending: ${fmt(s.currentMonth.spending.total)} (needs ${fmt(s.currentMonth.spending.needs)}, wants ${fmt(s.currentMonth.spending.wants)}, savings-funded ${fmt(s.currentMonth.spending.savingsFunded)})`)
  lines.push(`Net savings: ${fmt(s.currentMonth.netSavings)}`)
  lines.push(`Budget utilization: needs ${s.currentMonth.budgetUtilization.needsPct}%, wants ${s.currentMonth.budgetUtilization.wantsPct}%, total ${s.currentMonth.budgetUtilization.totalPct}%`)
  lines.push('')

  // Averages
  lines.push('## Trailing Averages')
  const a3 = s.averages.threeMonth
  const a6 = s.averages.sixMonth
  lines.push(`3-month avg: income ${fmt(a3.income)}, spending ${fmt(a3.spending)}, net savings ${fmt(a3.netSavings)}`)
  lines.push(`6-month avg: income ${fmt(a6.income)}, spending ${fmt(a6.spending)}, net savings ${fmt(a6.netSavings)}`)
  lines.push('')

  // Accounts
  lines.push('## Accounts')
  lines.push(`Net worth: ${fmt(s.accounts.netWorth)} (assets ${fmt(s.accounts.totalAssets)}, liabilities ${fmt(s.accounts.totalLiabilities)})`)
  for (const g of s.accounts.groups) {
    const total = g.accounts.reduce((sum, a) => sum + a.balance, 0)
    lines.push(`  ${g.group}: ${fmt(total)}`)
    for (const a of g.accounts) {
      lines.push(`    - ${a.name} (${a.type}): ${fmt(a.balance)}`)
    }
  }
  lines.push('')

  // Goals
  if (s.goals.length > 0) {
    lines.push('## Goals')
    for (const g of s.goals) {
      lines.push(`  ${g.name} (${g.goalType}, priority ${g.priority}): ${fmt(g.currentAmount)}/${fmt(g.targetAmount)} (${g.percentComplete}%)`)
    }
    lines.push('')
  }

  // Paycheck
  lines.push('## Latest Paycheck')
  lines.push(`Gross: ${fmt(s.paycheck.latestGross)}, Net: ${fmt(s.paycheck.latestNet)}`)
  lines.push(`401k: ${fmt(s.paycheck.monthly401k)}/mo, Employer match: ${fmt(s.paycheck.monthlyEmployerMatch)}/mo`)
  lines.push(`HSA: ${fmt(s.paycheck.monthlyHSA)}/mo, ESPP: ${fmt(s.paycheck.monthlyESPP)}/mo`)
  lines.push(`Effective tax rate: ${Math.round(s.paycheck.effectiveTaxRate * 100)}%`)
  lines.push('')

  // Budgets
  if (s.budgets.length > 0) {
    lines.push('## Budgets (this month)')
    for (const b of s.budgets) {
      const status = b.remaining < 0 ? 'OVER' : 'ok'
      lines.push(`  ${b.categoryName} (${b.budgetType}): ${fmt(b.spent)}/${fmt(b.limit)} — ${fmt(b.remaining)} remaining [${status}]`)
    }
    lines.push('')
  }

  // RSU Vests
  if (s.upcomingRsuVests.length > 0) {
    lines.push('## Upcoming RSU Vests')
    for (const v of s.upcomingRsuVests) {
      lines.push(`  ${v.vestDate}: ${v.shares} shares (~${fmt(v.estimatedValue)})`)
    }
    lines.push('')
  }

  return lines.join('\n')
}
