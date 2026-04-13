import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Sparkles, Loader2, Check } from 'lucide-react'
import { getToolLabel } from './toolLabels'

interface ToolInvocation {
  toolName: string
  state: string
}

interface StreamOfThoughtProps {
  toolInvocations: ToolInvocation[]
  isStreaming: boolean
}

const EXCLUDED_TOOLS = new Set(['propose_budget_changes'])

export function StreamOfThought({ toolInvocations, isStreaming }: StreamOfThoughtProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const wasStreaming = useRef(isStreaming)

  // Filter out tools that render their own UI
  const steps = toolInvocations.filter(t => !EXCLUDED_TOOLS.has(t.toolName))

  // Auto-collapse when streaming ends
  useEffect(() => {
    if (wasStreaming.current && !isStreaming) {
      const timer = setTimeout(() => setIsExpanded(false), 400)
      return () => clearTimeout(timer)
    }
    wasStreaming.current = isStreaming
  }, [isStreaming])

  if (steps.length === 0) return null

  const completedCount = steps.filter(s => s.state === 'output-available').length
  const summaryText = completedCount === 1
    ? 'Checked 1 source'
    : `Checked ${completedCount} sources`

  return (
    <div className="mb-2">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(prev => !prev)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-[#1F1410]/40 transition-colors hover:bg-[#1F1410]/[0.02]"
      >
        <Sparkles
          size={14}
          className={`text-[#14B8A6] ${isStreaming ? 'animate-pulse' : ''}`}
        />
        <span className="flex-1 text-left">
          {isStreaming ? 'Thinking...' : summaryText}
        </span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={12} className="text-[#1F1410]/20" />
        </motion.div>
      </button>

      {/* Collapsible step list */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1 px-3 pb-1">
              {steps.map((step, index) => {
                const { label, icon: Icon } = getToolLabel(step.toolName)
                const isDone = step.state === 'output-available'

                return (
                  <motion.div
                    key={`${step.toolName}-${index}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08, duration: 0.2 }}
                    className="flex items-center gap-2 text-xs text-[#1F1410]/40"
                  >
                    <Icon size={12} className="shrink-0 text-[#1F1410]/25" />
                    <span className="flex-1">{label}</span>
                    {isDone ? (
                      <Check size={12} className="shrink-0 text-[#14B8A6]" />
                    ) : (
                      <Loader2 size={12} className="shrink-0 animate-spin text-[#1F1410]/20" />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
