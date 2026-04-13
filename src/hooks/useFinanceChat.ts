import { useMemo } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { useAuth } from '../contexts/AuthContext'
import { AGENT_API_URL } from '../lib/agentApi'

export function useFinanceChat() {
  const { session } = useAuth()
  const accessToken = session?.access_token || ''

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${AGENT_API_URL}/chat`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    [accessToken],
  )

  const chat = useChat({ transport })

  return chat
}
