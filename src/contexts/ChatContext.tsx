import React, { createContext, useContext, useState, useCallback } from 'react'
import { useFinanceChat } from '../hooks/useFinanceChat'
import type { UIMessage } from 'ai'

export type BudgetProposal = {
  targetMonth: string
  changes: {
    budgetId: string
    category: string
    currentLimit: number
    newLimit: number
    delta: number
    reason: string
  }[]
} | null

interface ChatContextType {
  messages: UIMessage[]
  sendMessage: (params: { text: string }) => void
  status: string
  error: Error | undefined
  isOpen: boolean
  openChat: (initialMessage?: string) => void
  closeChat: () => void
  budgetVersion: number
  notifyBudgetChange: () => void
  budgetProposal: BudgetProposal
  setBudgetProposal: (p: BudgetProposal) => void
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const chat = useFinanceChat()
  const [isOpen, setIsOpen] = useState(false)

  const openChat = useCallback((initialMessage?: string) => {
    setIsOpen(true)
    if (initialMessage?.trim()) {
      chat.sendMessage({ text: initialMessage.trim() })
    }
  }, [chat])

  const closeChat = useCallback(() => {
    setIsOpen(false)
  }, [])

  // Budget version increments when the frontend applies budget changes
  const [budgetVersion, setBudgetVersion] = useState(0)
  const notifyBudgetChange = useCallback(() => {
    setBudgetVersion(v => v + 1)
  }, [])

  // Budget proposal data (set by BudgetView when "Suggest Budget" is clicked)
  const [budgetProposal, setBudgetProposal] = useState<BudgetProposal>(null)

  const value: ChatContextType = {
    messages: chat.messages,
    sendMessage: chat.sendMessage,
    status: chat.status,
    error: chat.error,
    isOpen,
    openChat,
    closeChat,
    budgetVersion,
    notifyBudgetChange,
    budgetProposal,
    setBudgetProposal,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return context
}
