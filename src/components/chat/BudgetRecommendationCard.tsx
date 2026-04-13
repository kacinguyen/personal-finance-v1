import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useChatContext } from '../../contexts/ChatContext'

type ProposedChange = {
  budgetId: string
  category: string
  currentLimit: number
  newLimit: number
  delta: number
  reason: string
}

type Props = {
  targetMonth: string
  changes: ProposedChange[]
}

export function BudgetRecommendationCard({ targetMonth, changes }: Props) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(changes.map(c => c.budgetId)))
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const { notifyBudgetChange } = useChatContext()

  const toggle = (budgetId: string) => {
    if (applied) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(budgetId)) next.delete(budgetId)
      else next.add(budgetId)
      return next
    })
  }

  const handleApply = async () => {
    const toApply = changes.filter(c => selected.has(c.budgetId))
    if (toApply.length === 0) return

    setApplying(true)
    for (const change of toApply) {
      // Write only to budget_months — scoped to this month only
      await supabase
        .from('budget_months')
        .upsert(
          { budget_id: change.budgetId, month: targetMonth, monthly_limit: change.newLimit },
          { onConflict: 'budget_id,month' },
        )
    }
    setApplying(false)
    setApplied(true)
    notifyBudgetChange()
  }

  const fmtDelta = (d: number) => (d >= 0 ? `+$${d}` : `-$${Math.abs(d)}`)

  const monthLabel = new Date(targetMonth + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="my-1 rounded-xl border border-[#1F1410]/5 bg-white overflow-hidden">
      <div className="px-3 py-2 border-b border-[#1F1410]/5 bg-[#1F1410]/[0.02]">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1F1410]/40">
          Suggested changes for {monthLabel}
        </p>
      </div>

      <div className="divide-y divide-[#1F1410]/5">
        {changes.map(c => {
          const isSelected = selected.has(c.budgetId)
          const isIncrease = c.delta > 0
          return (
            <button
              key={c.budgetId}
              onClick={() => toggle(c.budgetId)}
              disabled={applied}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                applied ? 'cursor-default' : 'hover:bg-[#1F1410]/[0.02] cursor-pointer'
              }`}
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? applied
                      ? 'bg-[#10B981] border-[#10B981]'
                      : 'bg-[#14B8A6] border-[#14B8A6]'
                    : 'border-[#1F1410]/20'
                }`}
              >
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[#1F1410]/80 truncate">{c.category}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[#1F1410]/40">${c.currentLimit}</span>
                    <span className="text-xs text-[#1F1410]/30">&rarr;</span>
                    <span className="text-xs font-semibold text-[#1F1410]">${c.newLimit}</span>
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                        isIncrease ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#FF6B6B]/10 text-[#FF6B6B]'
                      }`}
                    >
                      {fmtDelta(c.delta)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-[#1F1410]/40 truncate mt-0.5">{c.reason}</p>
              </div>
            </button>
          )
        })}
      </div>

      <div className="px-3 py-2.5 border-t border-[#1F1410]/5">
        {applied ? (
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[#10B981]">
            <Check className="w-3.5 h-3.5" />
            Changes applied
          </div>
        ) : (
          <button
            onClick={handleApply}
            disabled={applying || selected.size === 0}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1F1410] text-white hover:bg-[#1F1410]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {applying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Applying...
              </>
            ) : (
              `Apply ${selected.size} change${selected.size !== 1 ? 's' : ''}`
            )}
          </button>
        )}
      </div>
    </div>
  )
}
