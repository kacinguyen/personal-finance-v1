import { useState } from 'react'
import { X } from 'lucide-react'
import { isDemoMode } from '../../lib/demo'

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (!isDemoMode || dismissed) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 bg-[#F59E0B]/10 border-b border-[#F59E0B]/20 text-sm text-[#1F1410]/70">
      <span>You're viewing Pachira with sample data</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 p-0.5 rounded hover:bg-[#F59E0B]/20 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
