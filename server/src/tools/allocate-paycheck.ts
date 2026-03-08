import { z } from 'zod'
import { tool, zodSchema } from 'ai'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildFinancialSnapshot } from '../context/financial-snapshot.js'

const inputSchema = z.object({})

type PaycheckFrequency = 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly'

const PAYCHECKS_PER_MONTH: Record<PaycheckFrequency, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  'semi-monthly': 2,
  monthly: 1,
}

function inferPaycheckFrequency(payDates: string[]): {
  frequency: PaycheckFrequency
  paychecksPerMonth: number
  warning?: string
} {
  if (payDates.length < 2) {
    return {
      frequency: 'biweekly',
      paychecksPerMonth: PAYCHECKS_PER_MONTH.biweekly,
      warning: 'Fewer than 2 paystubs available — defaulting to biweekly. Accuracy improves with more paycheck history.',
    }
  }

  // Compute gaps between consecutive pay dates
  const sorted = [...payDates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / (1000 * 60 * 60 * 24)
    gaps.push(diff)
  }

  // Use median gap to be resilient to outliers
  gaps.sort((a, b) => a - b)
  const medianGap = gaps[Math.floor(gaps.length / 2)]

  let frequency: PaycheckFrequency
  if (medianGap <= 9) frequency = 'weekly'
  else if (medianGap <= 16) frequency = 'biweekly'
  else if (medianGap <= 25) frequency = 'semi-monthly'
  else frequency = 'monthly'

  return { frequency, paychecksPerMonth: PAYCHECKS_PER_MONTH[frequency] }
}

type GoalRow = {
  name: string
  goal_type: string
  current_amount: number
  target_amount: number
  priority: number
  deadline: string | null
  monthly_budget: number | null
  auto_contribute: boolean
  contribution_field: string | null
}

function computeGoalContributions(
  goals: GoalRow[],
  paychecksPerMonth: number,
  availableSurplus: number,
  warnings: string[],
): { category: string; amount: number; note: string; priority: number }[] {
  const allocations: { category: string; amount: number; note: string; priority: number }[] = []
  let remaining = availableSurplus

  // Filter to non-payroll goals, sorted by priority
  const activeGoals = goals
    .filter(g => !(g.auto_contribute && g.contribution_field))
    .sort((a, b) => (a.priority || 99) - (b.priority || 99))

  for (const goal of activeGoals) {
    if (remaining <= 0) break

    let monthlyAmount: number | null = null

    if (goal.monthly_budget && goal.monthly_budget > 0) {
      monthlyAmount = goal.monthly_budget
    } else if (goal.deadline && goal.target_amount > 0) {
      const now = new Date()
      const deadlineDate = new Date(goal.deadline)
      const monthsToDeadline = Math.max(
        1,
        (deadlineDate.getFullYear() - now.getFullYear()) * 12 +
          (deadlineDate.getMonth() - now.getMonth()),
      )
      const gap = Math.max(0, goal.target_amount - (goal.current_amount || 0))
      if (gap > 0) {
        monthlyAmount = gap / monthsToDeadline
      }
    } else {
      warnings.push(`Goal "${goal.name}" has no deadline or monthly budget — skipped from allocation.`)
      continue
    }

    if (monthlyAmount === null || monthlyAmount <= 0) continue

    const perCheck = Math.round(monthlyAmount / paychecksPerMonth)
    const capped = Math.min(perCheck, Math.round(remaining))

    if (capped > 0) {
      allocations.push({
        category: goal.name,
        amount: capped,
        note: goal.monthly_budget
          ? `$${monthlyAmount}/mo budget ÷ ${paychecksPerMonth} paychecks`
          : `Paced to reach $${Math.round(goal.target_amount).toLocaleString()} by ${goal.deadline}`,
        priority: goal.priority || 99,
      })
      remaining -= capped
    }
  }

  return allocations
}

export function allocatePaycheckTool(supabase: SupabaseClient, userId: string) {
  return tool({
    description:
      'Compute a per-paycheck allocation plan: how to split each paycheck across fixed expenses, variable expenses, emergency fund, goals, and investing. Use when the user asks how to split or allocate their paycheck.',
    inputSchema: zodSchema(inputSchema),
    execute: async () => {
      const [snapshot, budgetsRes, goalsRes, paystubsRes] = await Promise.all([
        buildFinancialSnapshot(supabase, userId),
        supabase
          .from('budgets')
          .select('*, categories(name)')
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
          .select('pay_date, net_pay')
          .eq('user_id', userId)
          .order('pay_date', { ascending: false })
          .limit(12),
      ])

      const warnings: string[] = []
      const paystubs = paystubsRes.data || []

      // --- No paystubs: bail early ---
      if (paystubs.length === 0) {
        return {
          paycheckFrequency: 'unknown',
          netPayPerCheck: 0,
          paychecksPerMonth: 0,
          allocations: [],
          payrollDeductions: { traditional401k: 0, hsa: 0, espp: 0, employerMatch: 0, totalPreTax: 0 },
          investableSurplus: 0,
          warnings: ['No paystubs found. Import your paystubs so I can build a paycheck allocation plan.'],
          summary: 'I need paycheck data to build an allocation plan. Try importing your paystubs first.',
        }
      }

      // --- Infer frequency ---
      const payDates = paystubs.map((p: any) => p.pay_date)
      const { frequency, paychecksPerMonth, warning: freqWarning } = inferPaycheckFrequency(payDates)
      if (freqWarning) warnings.push(freqWarning)

      // --- Net pay per check ---
      const netPayPerCheck = Math.round(snapshot.paycheck.avgNet / paychecksPerMonth)

      // --- Budgets: fixed vs variable ---
      const budgetRows = budgetsRes.data || []
      let fixedMonthly = 0
      let variableMonthly = 0

      for (const b of budgetRows) {
        const limit = b.monthly_limit || 0
        if (b.flexibility === 'fixed') {
          fixedMonthly += limit
        } else {
          variableMonthly += limit
        }
      }

      const fixedPerCheck = Math.round(fixedMonthly / paychecksPerMonth)
      const variablePerCheck = Math.round(variableMonthly / paychecksPerMonth)

      const allocations: { category: string; amount: number; note: string; priority: number }[] = []

      if (fixedPerCheck > 0) {
        allocations.push({
          category: 'Fixed Expenses',
          amount: fixedPerCheck,
          note: `Rent, utilities, insurance, etc. ($${Math.round(fixedMonthly).toLocaleString()}/mo)`,
          priority: 0,
        })
      }

      if (variablePerCheck > 0) {
        allocations.push({
          category: 'Variable Expenses',
          amount: variablePerCheck,
          note: `Groceries, dining, entertainment, etc. ($${Math.round(variableMonthly).toLocaleString()}/mo)`,
          priority: 0,
        })
      }

      // --- Surplus after expenses ---
      let surplus = netPayPerCheck - fixedPerCheck - variablePerCheck

      // --- Waterfall step 1: Emergency fund ---
      const emergencyTarget = snapshot.averages.threeMonth.spending * 3
      const savingsBalance = snapshot.accounts.groups
        .filter(g => g.group === 'cash')
        .flatMap(g => g.accounts)
        .filter(a => a.type === 'savings')
        .reduce((sum, a) => sum + a.balance, 0)
      const emergencyGap = Math.max(0, emergencyTarget - savingsBalance)

      if (emergencyGap > 0 && surplus > 0) {
        // Pace to close in 6 months
        const monthlyEmergency = emergencyGap / 6
        const perCheck = Math.round(monthlyEmergency / paychecksPerMonth)
        const capped = Math.min(perCheck, Math.round(surplus))

        allocations.push({
          category: 'Emergency Fund',
          amount: capped,
          note: `$${Math.round(emergencyGap).toLocaleString()} gap — paced to fill in 6 months`,
          priority: 1,
        })
        surplus -= capped
      }

      // --- Payroll deductions (informational) ---
      const payrollDeductions = {
        traditional401k: Math.round(snapshot.paycheck.monthly401k / paychecksPerMonth),
        hsa: Math.round(snapshot.paycheck.monthlyHSA / paychecksPerMonth),
        espp: Math.round(snapshot.paycheck.monthlyESPP / paychecksPerMonth),
        employerMatch: Math.round(snapshot.paycheck.monthlyEmployerMatch / paychecksPerMonth),
        totalPreTax: Math.round(
          (snapshot.paycheck.monthly401k + snapshot.paycheck.monthlyHSA + snapshot.paycheck.monthlyESPP) /
            paychecksPerMonth,
        ),
      }

      // --- Waterfall step 3: Debt paydown ---
      const debtAccounts = snapshot.accounts.groups
        .filter(g => g.group === 'credit' || g.group === 'loan')
        .flatMap(g => g.accounts)
      const totalDebt = debtAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0)

      if (totalDebt > 0 && surplus > 0) {
        const debtPayment = Math.round(surplus * 0.2)
        if (debtPayment > 0) {
          allocations.push({
            category: 'Debt Paydown',
            amount: debtPayment,
            note: `20% of surplus toward $${Math.round(totalDebt).toLocaleString()} in outstanding balances`,
            priority: 3,
          })
          surplus -= debtPayment
        }
      }

      // --- Waterfall step 4: Goal contributions ---
      const goalRows: GoalRow[] = (goalsRes.data || []).map((g: any) => ({
        name: g.name,
        goal_type: g.goal_type,
        current_amount: g.current_amount || 0,
        target_amount: g.target_amount || 0,
        priority: g.priority || 99,
        deadline: g.deadline,
        monthly_budget: g.monthly_budget,
        auto_contribute: g.auto_contribute || false,
        contribution_field: g.contribution_field || null,
      }))

      // Show payroll-deducted goals in payroll section
      const payrollGoals = goalRows.filter(g => g.auto_contribute && g.contribution_field)
      for (const pg of payrollGoals) {
        const field = pg.contribution_field as string
        if (field === 'traditional_401k' || field === 'roth_401k') {
          // Already covered in payrollDeductions.traditional401k
        } else if (field === 'hsa_contribution') {
          // Already covered
        } else if (field === 'espp_contribution') {
          // Already covered
        }
      }

      const goalAllocations = computeGoalContributions(goalRows, paychecksPerMonth, Math.max(0, surplus), warnings)
      for (const ga of goalAllocations) {
        surplus -= ga.amount
      }
      allocations.push(...goalAllocations)

      // --- Investable surplus ---
      const investableSurplus = Math.max(0, Math.round(surplus))

      if (investableSurplus > 0) {
        allocations.push({
          category: 'Investable Surplus',
          amount: investableSurplus,
          note: 'Remaining after all priorities — consider index funds or brokerage',
          priority: 99,
        })
      }

      // --- Negative surplus warning ---
      if (netPayPerCheck - fixedPerCheck - variablePerCheck < 0) {
        warnings.push(
          `Your budgeted expenses ($${Math.round(fixedMonthly + variableMonthly).toLocaleString()}/mo) exceed your net pay ($${Math.round(snapshot.paycheck.avgNet).toLocaleString()}/mo). Review your budgets to free up room for savings.`,
        )
      }

      // --- Summary ---
      const summary =
        investableSurplus > 0
          ? `Each ${frequency} paycheck of $${netPayPerCheck.toLocaleString()}: $${fixedPerCheck.toLocaleString()} fixed, $${variablePerCheck.toLocaleString()} variable, $${investableSurplus.toLocaleString()} to invest.`
          : `Each ${frequency} paycheck of $${netPayPerCheck.toLocaleString()} is fully allocated across expenses and goals.`

      return {
        paycheckFrequency: frequency,
        netPayPerCheck,
        paychecksPerMonth,
        allocations,
        payrollDeductions,
        investableSurplus,
        warnings,
        summary,
      }
    },
  })
}
