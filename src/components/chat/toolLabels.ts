import type { LucideIcon } from 'lucide-react'
import {
  Search,
  CalendarDays,
  PieChart,
  Landmark,
  Wallet,
  Target,
  Receipt,
  Workflow,
  ArrowRightLeft,
  Lightbulb,
  ArrowLeftRight,
  Store,
  Pencil,
  Tag,
  Users,
  Clock,
  CheckCircle,
  Database,
  StickyNote,
  Settings,
  Wrench,
} from 'lucide-react'

interface ToolLabel {
  label: string
  icon: LucideIcon
}

const TOOL_LABELS: Record<string, ToolLabel> = {
  query_transactions: { label: 'Searching your transactions', icon: Search },
  get_monthly_summary: { label: 'Pulling your monthly summary', icon: CalendarDays },
  get_category_spending: { label: 'Checking category spending', icon: PieChart },
  get_accounts: { label: 'Looking up your accounts', icon: Landmark },
  get_budgets: { label: 'Reviewing your budgets', icon: Wallet },
  get_goals: { label: 'Checking your savings goals', icon: Target },
  get_paystubs: { label: 'Reviewing your pay history', icon: Receipt },
  run_waterfall: { label: 'Running savings waterfall', icon: Workflow },
  allocate_paycheck: { label: 'Allocating your paycheck', icon: ArrowRightLeft },
  generate_insights: { label: 'Generating insights', icon: Lightbulb },
  compare_months: { label: 'Comparing months', icon: ArrowLeftRight },
  get_top_merchants: { label: 'Finding top merchants', icon: Store },
  update_transaction_note: { label: 'Updating transaction note', icon: Pencil },
  recategorize_transaction: { label: 'Recategorizing transaction', icon: Tag },
  split_with_others: { label: 'Splitting transaction', icon: Users },
  create_expected_return: { label: 'Tracking expected return', icon: Clock },
  resolve_expected_return: { label: 'Resolving expected return', icon: CheckCircle },
  gather_budget_context: { label: 'Gathering budget details', icon: Database },
  add_budget_note: { label: 'Adding budget note', icon: StickyNote },
  apply_budget_recommendations: { label: 'Applying budget changes', icon: Settings },
}

const FALLBACK: ToolLabel = { label: 'Working on it', icon: Wrench }

export function getToolLabel(toolName: string): ToolLabel {
  return TOOL_LABELS[toolName] ?? FALLBACK
}
