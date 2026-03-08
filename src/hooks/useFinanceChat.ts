import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useAuth } from '../contexts/AuthContext'
import { AGENT_API_URL } from '../lib/agentApi'

export function useFinanceChat() {
  const { session } = useAuth()

  const chat = useChat({
    transport: new DefaultChatTransport({
      api: `${AGENT_API_URL}/chat`,
      headers: {
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
    }),
  })

  return chat
}
