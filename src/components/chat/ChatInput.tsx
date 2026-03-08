import { Send } from 'lucide-react'
import { useRef, type KeyboardEvent, type FormEvent } from 'react'

interface ChatInputProps {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
}

export function ChatInput({ input, isLoading, onInputChange, onSubmit }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (input.trim() && !isLoading) {
        onSubmit(e as unknown as FormEvent)
      }
    }
  }

  const handleInput = () => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-[#1F1410]/10 p-4">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => {
          onInputChange(e.target.value)
          handleInput()
        }}
        onKeyDown={handleKeyDown}
        placeholder="Ask Pachi anything..."
        disabled={isLoading}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-[#1F1410]/10 px-3 py-2 text-sm text-[#1F1410] placeholder:text-[#1F1410]/30 focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/20 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#14B8A6] text-white transition-opacity disabled:opacity-30"
      >
        <Send size={16} />
      </button>
    </form>
  )
}
