import React, { createContext, useContext, useState, useCallback } from 'react'
import { useFinanceChat } from '../hooks/useFinanceChat'
import type { UIMessage } from 'ai'

interface ChatContextType {
  messages: UIMessage[]
  sendMessage: (params: { text: string }) => void
  status: string
  isOpen: boolean
  openChat: (initialMessage?: string) => void
  closeChat: () => void
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

  const value: ChatContextType = {
    messages: chat.messages,
    sendMessage: chat.sendMessage,
    status: chat.status,
    isOpen,
    openChat,
    closeChat,
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
