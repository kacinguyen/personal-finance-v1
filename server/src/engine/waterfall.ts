import type { FinancialSnapshot } from '../context/financial-snapshot.js'

export type WaterfallStep = {
  priority: number
  name: string
  status: 'complete' | 'in_progress' | 'action_needed' | 'not_applicable'
  currentValue: number
  targetValue: number
  gap: number
  recommendation: string
}

export function runWaterfall(snapshot: FinancialSnapshot): WaterfallStep[] {
  const steps: WaterfallStep[] = []

  // 1. Emergency Fund — target = 3 × 3-month avg spending
  const emergencyTarget = snapshot.averages.threeMonth.spending * 3
  const savingsBalance = snapshot.accounts.groups
    .filter(g => g.group === 'cash')
    .flatMap(g => g.accounts)
    .filter(a => a.type === 'savings')
    .reduce((sum, a) => sum + a.balance, 0)
  const emergencyGap = Math.max(0, emergencyTarget - savingsBalance)

  steps.push({
    priority: 1,
    name: 'Emergency Fund',
    status: emergencyGap === 0 ? 'complete'
      : savingsBalance > emergencyTarget * 0.5 ? 'in_progress'
      : 'action_needed',
    currentValue: savingsBalance,
    targetValue: emergencyTarget,
    gap: emergencyGap,
    recommendation: emergencyGap === 0
      ? 'Emergency fund is fully funded. Great job!'
      : `You need $${Math.round(emergencyGap).toLocaleString()} more to reach your 3-month emergency fund target of $${Math.round(emergencyTarget).toLocaleString()}.`,
  })

  // 2. 401k Match
  const { monthly401k, monthlyEmployerMatch } = snapshot.paycheck
  const hasMatch = monthlyEmployerMatch > 0
  const matchStatus = !hasMatch ? 'not_applicable'
    : monthly401k > 0 ? 'complete'
    : 'action_needed'

  steps.push({
    priority: 2,
    name: '401k Employer Match',
    status: matchStatus,
    currentValue: monthly401k,
    targetValue: monthlyEmployerMatch > 0 ? monthly401k : 0,
    gap: 0,
    recommendation: !hasMatch
      ? 'No employer match detected in your paystubs.'
      : monthly401k > 0
        ? `You're contributing $${Math.round(monthly401k).toLocaleString()}/mo to your 401k and receiving $${Math.round(monthlyEmployerMatch).toLocaleString()}/mo in employer match. Don't leave free money on the table!`
        : 'You have an employer 401k match available but aren\'t contributing. This is free money — prioritize contributing at least enough to get the full match.',
  })

  // 3. High-Interest Debt
  const debtAccounts = snapshot.accounts.groups
    .filter(g => g.group === 'credit' || g.group === 'loan')
    .flatMap(g => g.accounts)
  const totalDebt = debtAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0)

  steps.push({
    priority: 3,
    name: 'High-Interest Debt',
    status: totalDebt === 0 ? 'complete' : 'action_needed',
    currentValue: totalDebt,
    targetValue: 0,
    gap: totalDebt,
    recommendation: totalDebt === 0
      ? 'No outstanding debt. You\'re debt-free!'
      : `You have $${Math.round(totalDebt).toLocaleString()} in outstanding debt across ${debtAccounts.length} account(s). Confirm your interest rates — if any are above 7%, prioritize paying those down before investing.`,
  })

  // 4. ESPP
  const { monthlyESPP } = snapshot.paycheck
  const esppGoal = snapshot.goals.find(g => g.goalType === 'espp')
  const esppStatus = monthlyESPP > 0 ? 'complete'
    : esppGoal ? 'action_needed'
    : 'not_applicable'

  steps.push({
    priority: 4,
    name: 'ESPP',
    status: esppStatus,
    currentValue: monthlyESPP,
    targetValue: esppGoal?.targetAmount || 0,
    gap: esppGoal ? Math.max(0, esppGoal.targetAmount - esppGoal.currentAmount) : 0,
    recommendation: monthlyESPP > 0
      ? `You're contributing $${Math.round(monthlyESPP).toLocaleString()}/mo to ESPP. If your plan offers a 15% discount with immediate sell, this is one of the best guaranteed returns available.`
      : esppGoal
        ? 'You have an ESPP goal but aren\'t currently contributing. If your employer offers a discount of 10%+, this is essentially free money.'
        : 'No ESPP information available. If your employer offers an ESPP with a discount, consider enrolling.',
  })

  // 5. RSU
  const nextVest = snapshot.upcomingRsuVests[0]

  steps.push({
    priority: 5,
    name: 'RSU Diversification',
    status: nextVest ? 'in_progress' : 'not_applicable',
    currentValue: nextVest?.estimatedValue || 0,
    targetValue: 0,
    gap: 0,
    recommendation: nextVest
      ? `Your next RSU vest is on ${nextVest.vestDate} (${nextVest.shares} shares, ~$${Math.round(nextVest.estimatedValue).toLocaleString()}). Consider sell-to-cover to diversify and reduce concentration risk.`
      : 'No upcoming RSU vests.',
  })

  return steps
}
