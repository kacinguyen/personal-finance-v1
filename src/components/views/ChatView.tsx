import { useEffect, useRef, useState } from 'react'
import { useFinanceChat } from '../../hooks/useFinanceChat'
import { ChatMessage } from '../chat/ChatMessage'
import { ChatInput } from '../chat/ChatInput'

export function ChatView() {
  const { messages, sendMessage, status } = useFinanceChat()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')

  const isLoading = status === 'streaming' || status === 'submitted'

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input.trim() })
    setInput('')
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-[#1F1410]/10 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#14B8A6]/10 text-sm font-medium text-[#14B8A6]">
          P
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#1F1410]">Pachi</h2>
          <p className="text-[10px] text-[#1F1410]/40">Financial Advisor</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
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
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
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
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mx-auto w-full max-w-2xl">
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
