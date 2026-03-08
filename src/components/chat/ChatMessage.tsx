import type { UIMessage } from 'ai'

interface ChatMessageProps {
  message: UIMessage
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

function formatContent(content: string): JSX.Element {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Bullet points
    if (line.match(/^[-•*]\s/)) {
      const text = line.replace(/^[-•*]\s/, '')
      elements.push(
        <div key={i} className="flex gap-1.5 pl-1">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#1F1410]/30" />
          <span>{renderInline(text)}</span>
        </div>
      )
      continue
    }

    // Numbered lists
    if (line.match(/^\d+\.\s/)) {
      const match = line.match(/^(\d+)\.\s(.*)/)
      if (match) {
        elements.push(
          <div key={i} className="flex gap-1.5 pl-1">
            <span className="shrink-0 text-[#1F1410]/40">{match[1]}.</span>
            <span>{renderInline(match[2])}</span>
          </div>
        )
        continue
      }
    }

    // Empty lines become spacing
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />)
      continue
    }

    // Regular text
    elements.push(<p key={i}>{renderInline(line)}</p>)
  }

  return <>{elements}</>
}

function renderInline(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = []
  const regex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(<strong key={match.index} className="font-semibold">{match[1]}</strong>)
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const text = getTextContent(message)

  if (!text) return null

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#14B8A6]/10 text-xs font-medium text-[#14B8A6]">
          P
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-[#14B8A6]/10 text-[#1F1410]'
            : 'border border-[#1F1410]/5 bg-white text-[#1F1410]'
        }`}
      >
        {isUser ? text : formatContent(text)}
      </div>
    </div>
  )
}
