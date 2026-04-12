import { Send } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useChatContext } from '../../contexts/ChatContext'

export function ChatButton() {
  const { isOpen, openChat } = useChatContext()
  const [input, setInput] = useState('')

  const handleSubmit = () => {
    if (!input.trim()) return
    openChat(input.trim())
    setInput('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <AnimatePresence>
      {!isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 left-4 right-4 z-50 lg:bottom-6 lg:left-auto lg:right-6 lg:w-[360px]"
        >
          <div className="flex items-center gap-2 rounded-xl border border-[#1F1410]/10 bg-white px-3 py-2 shadow-md">
            <button
              onClick={() => openChat()}
              title="Open chat"
              className="group relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#14B8A6]/10 text-[10px] font-medium text-[#14B8A6] transition-colors hover:bg-[#14B8A6]/20"
            >
              P
              <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1F1410] px-2.5 py-1 text-[11px] font-normal text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                Open chat
              </span>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Pachi anything..."
              className="flex-1 bg-transparent text-sm text-[#1F1410] placeholder:text-[#1F1410]/30 focus:outline-none"
            />
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#14B8A6] text-white transition-opacity disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
