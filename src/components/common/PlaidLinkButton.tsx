import { Link2, Loader2 } from 'lucide-react'
import { usePlaidLink } from '../../hooks/usePlaidLink'
import { TAB_COLORS } from '../../lib/colors'

type PlaidLinkButtonProps = {
  /** Called after successful Plaid Link flow and token exchange. */
  onSuccess?: () => void
  /** Pass plaid_item_id for re-auth / update mode. */
  plaidItemId?: string
  className?: string
  /** Button label override. */
  label?: string
}

export function PlaidLinkButton({
  onSuccess,
  plaidItemId,
  className = '',
  label,
}: PlaidLinkButtonProps) {
  const { openLink, loading, error } = usePlaidLink({ plaidItemId, onSuccess })

  const buttonLabel = label ?? (plaidItemId ? 'Re-connect' : 'Connect Bank')

  return (
    <div className="inline-flex flex-col items-end">
      <button
        onClick={openLink}
        disabled={loading}
        className={`px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-wait ${className}`}
        style={{ backgroundColor: TAB_COLORS.accounts }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
        {buttonLabel}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1 max-w-[200px] text-right">{error}</p>
      )}
    </div>
  )
}
