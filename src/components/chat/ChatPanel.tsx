import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useChatContext } from '../../contexts/ChatContext'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { BudgetRecommendationCard } from './BudgetRecommendationCard'

export function ChatPanel() {
  const { messages, sendMessage, status, error, isOpen, closeChat, budgetProposal } = useChatContext()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')

  const isLoading = status === 'streaming' || status === 'submitted'

  // Auto-scroll to bottom on new messages or budget proposal
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, budgetProposal, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input.trim() })
    setInput('')
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={closeChat}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 right-0 top-0 z-40 flex w-full flex-col border-l border-[#1F1410]/10 bg-[#FFFBF5] shadow-lg lg:w-[400px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#1F1410]/10 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14B8A6]/10 text-sm font-medium text-[#14B8A6]">
                  P
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#1F1410]">Pachi</h2>
                  <p className="text-[10px] text-[#1F1410]/40">Financial Advisor</p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#1F1410]/40 transition-colors hover:bg-[#1F1410]/5 hover:text-[#1F1410]/60"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#14B8A6]/10 text-2xl">
                    👋
                  </div>
                  <p className="text-sm font-medium text-[#1F1410]/60">
                    Hey! I'm Pachi, your financial advisor.
                  </p>
                  <p className="mt-1 text-xs text-[#1F1410]/40">
                    Ask me about your spending, savings goals, or what to do with extra cash.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {isLoading && (
                    <div className="flex gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#14B8A6]/10 text-xs font-medium text-[#14B8A6]">
                        P
                      </div>
                      <div className="rounded-xl border border-[#1F1410]/5 bg-white px-3.5 py-2.5">
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1F1410]/20" style={{ animationDelay: '0ms' }} />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1F1410]/20" style={{ animationDelay: '150ms' }} />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#1F1410]/20" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  {budgetProposal && !isLoading && (
                    <div className="px-1">
                      <BudgetRecommendationCard
                        targetMonth={budgetProposal.targetMonth}
                        changes={budgetProposal.changes}
                      />
                    </div>
                  )}
                  {error && !isLoading && (
                    <div className="flex gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FF6B6B]/10 text-xs font-medium text-[#FF6B6B]">
                        !
                      </div>
                      <div className="rounded-xl border border-[#FF6B6B]/10 bg-[#FF6B6B]/5 px-3.5 py-2.5">
                        <p className="text-xs text-[#FF6B6B]">
                          Something went wrong. Please try again.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input */}
            <ChatInput
              input={input}
              isLoading={isLoading}
              onInputChange={setInput}
              onSubmit={handleSubmit}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
