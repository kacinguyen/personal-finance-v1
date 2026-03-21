import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { streamText, type UIMessage, convertToModelMessages, stepCountIs } from 'ai'
import { getModel, MODEL_CONFIG } from '../llm/provider.js'
import { createServiceClient } from '../supabase/client.js'
import { buildFinancialSnapshot } from '../context/financial-snapshot.js'
import { buildSystemPrompt } from '../prompts/financial-advisor.js'
import { createTools } from '../tools/index.js'

const messagePartSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
}).passthrough()

const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().optional(),
  parts: z.array(messagePartSchema).optional(),
}).passthrough()

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1, 'At least one message is required'),
})

export async function chatRoutes(app: FastifyInstance) {
  app.post('/api/chat', async (request, reply) => {
    const parsed = chatRequestSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parsed.error.issues.map(i => i.message),
      })
    }

    const { messages } = parsed.data as { messages: UIMessage[] }

    const userId = request.userId
    const supabase = createServiceClient()

    // Build financial context
    const snapshot = await buildFinancialSnapshot(supabase, userId)
    const systemPrompt = buildSystemPrompt(snapshot)

    // Create tools scoped to this user
    const tools = createTools(supabase, userId)

    const result = streamText({
      model: getModel(),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(5),
      temperature: MODEL_CONFIG.temperature,
      maxOutputTokens: MODEL_CONFIG.maxTokens,
      onStepFinish: (event) => {
        if (event.toolCalls && event.toolCalls.length > 0) {
          for (const tc of event.toolCalls) {
            app.log.info({ tool: tc.toolName, args: JSON.stringify((tc as any).args).slice(0, 200) }, 'tool called')
          }
        }
        if (event.toolResults && event.toolResults.length > 0) {
          for (const tr of event.toolResults) {
            const resultPreview = JSON.stringify((tr as any).result).slice(0, 500)
            app.log.info({ tool: tr.toolName, resultPreview }, 'tool result')
          }
        }
        if (!event.toolCalls?.length && !event.toolResults?.length) {
          app.log.info({ text: event.text?.slice(0, 100) }, 'step finished (no tools)')
        }
      },
    })

    const response = result.toUIMessageStreamResponse()

    reply.raw.writeHead(
      response.status || 200,
      Object.fromEntries(response.headers.entries())
    )

    if (response.body) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        reply.raw.write(decoder.decode(value, { stream: true }))
      }
    }

    reply.raw.end()
  })
}
