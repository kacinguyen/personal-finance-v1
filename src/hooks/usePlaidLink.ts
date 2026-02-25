import { useState, useCallback, useEffect } from 'react'
import { usePlaidLink as useReactPlaidLink } from 'react-plaid-link'
import { supabase } from '../lib/supabase'

type UsePlaidLinkOptions = {
  /** Pass a plaid_item_id to enter Plaid Link update (re-auth) mode. */
  plaidItemId?: string
  /** Called after successful token exchange with the new accounts. */
  onSuccess?: () => void
}

export function usePlaidLink({ plaidItemId, onSuccess }: UsePlaidLinkOptions = {}) {
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createLinkToken = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const body: Record<string, string> = {}
      if (plaidItemId) body.plaid_item_id = plaidItemId

      const { data, error: fnError } = await supabase.functions.invoke(
        'plaid-create-link-token',
        { body },
      )

      if (fnError) {
        // Try to extract the actual error from the response body
        const context = (fnError as unknown as { context?: Response }).context
        if (context) {
          const errBody = await context.json().catch(() => null)
          if (errBody?.error) throw new Error(errBody.error)
        }
        throw new Error(fnError.message)
      }
      if (data?.error) throw new Error(data.error)

      setLinkToken(data.link_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create link token')
      setLoading(false)
    }
  }, [plaidItemId])

  const handlePlaidSuccess = useCallback(
    async (publicToken: string, metadata: { institution: { institution_id: string; name: string } | null }) => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          'plaid-exchange-token',
          {
            body: {
              public_token: publicToken,
              institution: metadata.institution ?? { institution_id: 'unknown', name: 'Unknown' },
            },
          },
        )

        if (data?.error) throw new Error(data.error)
        if (fnError) throw new Error(fnError.message)

        onSuccess?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to exchange token')
      } finally {
        setLoading(false)
        setLinkToken(null)
      }
    },
    [onSuccess],
  )

  const { open, ready } = useReactPlaidLink({
    token: linkToken,
    onSuccess: handlePlaidSuccess,
    onExit: () => {
      setLoading(false)
      setLinkToken(null)
    },
  })

  // Auto-open Link when token is ready
  useEffect(() => {
    if (linkToken && ready) {
      open()
    }
  }, [linkToken, ready, open])

  const openLink = useCallback(() => {
    createLinkToken()
  }, [createLinkToken])

  return { openLink, loading, error }
}
