import type { UIMessage } from 'ai'
import { StreamOfThought } from './StreamOfThought'

interface ChatMessageProps {
  message: UIMessage
  isStreaming?: boolean
}

function getTextContent(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map(p => p.text)
    .join('')
}

// In AI SDK v6, tool parts use type 'dynamic-tool' (or 'tool-${name}' for typed tools).
// Properties like toolName, state, output are directly on the part object.
function isToolPart(part: any): boolean {
  return part.type === 'dynamic-tool' || (typeof part.type === 'string' && part.type.startsWith('tool-'))
}

function getToolName(part: any): string {
  return part.toolName ?? part.type?.replace(/^tool-/, '') ?? ''
}

function getToolInvocations(message: UIMessage) {
  const invocations: Array<{ toolName: string; state: string }> = []
  for (const part of message.parts) {
    if (!isToolPart(part)) continue
    const p = part as any
    const toolName = getToolName(p)
    if (toolName) {
      invocations.push({ toolName, state: p.state ?? 'input-available' })
    }
  }
  return invocations
}

function isTableSeparator(line: string): boolean {
  return /^\|[\s-:|]+\|$/.test(line.trim())
}

function parseTableRow(line: string): string[] {
  return line
    .split('|')
    .slice(1, -1) // remove empty first/last from leading/trailing |
    .map(cell => cell.trim())
}

function renderTable(tableLines: string[], startKey: number): JSX.Element {
  // First line is header, second is separator, rest are body rows
  const headerCells = parseTableRow(tableLines[0])
  const bodyLines = tableLines.slice(2) // skip header + separator

  return (
    <div key={startKey} className="my-1 overflow-x-auto rounded-lg border border-[#1F1410]/5">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#1F1410]/5 bg-[#1F1410]/[0.02]">
            {headerCells.map((cell, j) => (
              <th key={j} className="px-2.5 py-1.5 text-left font-semibold text-[#1F1410]/50 whitespace-nowrap">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyLines.map((row, j) => {
            const cells = parseTableRow(row)
            return (
              <tr key={j} className={j % 2 === 1 ? 'bg-[#1F1410]/[0.01]' : ''}>
                {cells.map((cell, k) => (
                  <td key={k} className="px-2.5 py-1.5 text-[#1F1410]/70 whitespace-nowrap">
                    {renderInline(cell)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function formatContent(content: string): JSX.Element {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Markdown table: detect header row followed by separator row
    if (
      line.trim().startsWith('|') &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const tableLines: string[] = [line, lines[i + 1]]
      let j = i + 2
      while (j < lines.length && lines[j].trim().startsWith('|')) {
        tableLines.push(lines[j])
        j++
      }
      elements.push(renderTable(tableLines, i))
      i = j - 1 // skip past table lines
      continue
    }

    // Skip orphan separator lines
    if (isTableSeparator(line)) continue

    // Headings (### / ## / #)
    const headingMatch = line.match(/^(#{1,3})\s+(.*)/)
    if (headingMatch) {
      elements.push(
        <p key={i} className="text-xs font-semibold uppercase tracking-wide text-[#1F1410]/40 mt-1">
          {headingMatch[2]}
        </p>
      )
      continue
    }

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

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const text = getTextContent(message)
  const toolInvocations = !isUser ? getToolInvocations(message) : []

  if (!text && toolInvocations.length === 0) return null

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#14B8A6]/10 text-xs font-medium text-[#14B8A6]">
          P
        </div>
      )}
      <div
        className={`max-w-[85%] ${
          isUser
            ? 'rounded-xl px-3.5 py-2.5 text-sm leading-relaxed bg-[#14B8A6]/10 text-[#1F1410]'
            : 'text-sm leading-relaxed text-[#1F1410]'
        }`}
      >
        {isUser ? (
          text
        ) : (
          <>
            {toolInvocations.length > 0 && (
              <StreamOfThought
                toolInvocations={toolInvocations}
                isStreaming={isStreaming}
              />
            )}
            {text && (
              <div className="rounded-xl px-3.5 py-2.5 border border-[#1F1410]/5 bg-white">
                {formatContent(text)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
