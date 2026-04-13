import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { streamText, generateObject, type UIMessage, convertToModelMessages, stepCountIs } from 'ai'
import { getModel, MODEL_CONFIG } from '../llm/provider.js'
import { createServiceClient } from '../supabase/client.js'
import { buildFinancialSnapshot } from '../context/financial-snapshot.js'
import { buildSystemPrompt } from '../prompts/financial-advisor.js'
import { createTools } from '../tools/index.js'
import { gatherBudgetContextTool } from '../tools/gather-budget-context.js'

const budgetChangeSchema = z.object({
  changes: z.array(z.object({
    budgetId: z.string(),
    category: z.string(),
    currentLimit: z.number(),
    newLimit: z.number(),
    reason: z.string(),
  })),
})

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
  // Dedicated endpoint for budget suggestions — uses LLM to generate structured recommendations
  app.post('/api/budget-suggestions', async (request, reply) => {
    const bodySchema = z.object({
      targetMonth: z.string().describe('YYYY-MM-DD, first of month'),
      chatContext: z.string().optional().describe('Recent chat messages for additional context'),
    })
    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.issues })
    }

    const userId = request.userId
    const supabase = createServiceClient()
    const gatherTool = gatherBudgetContextTool(supabase, userId)
    const budgetContext = await (gatherTool as any).execute({ targetMonth: parsed.data.targetMonth })

    // Use LLM to generate structured recommendations from the data
    const result = await generateObject({
      model: getModel(),
      schema: z.object({ changes: budgetChangeSchema.shape.changes }),
      prompt: `You are a budget advisor. Based on the data below, suggest budget adjustments for ${parsed.data.targetMonth}.

Rules:
- Only suggest changes for leaf categories (isParent = false)
- Never change fixed categories unless spending data clearly shows the cost changed
- Use a blend of last month spending and trailing average
- Cap increases at 50% above current budget
- Round to nearest $10
- Keep total needs + wants within expected income of $${budgetContext.expectedIncome}
- Include a short reason for each change

${parsed.data.chatContext ? `\nAdditional user context:\n${parsed.data.chatContext}` : ''}

Budget context:
${JSON.stringify(budgetContext, null, 2)}`,
      temperature: 0.2,
    })

    return reply.send({
      targetMonth: parsed.data.targetMonth,
      ...result.object,
    })
  })

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
    let systemPrompt = buildSystemPrompt(snapshot)

    // Create tools scoped to this user
    const tools = createTools(supabase, userId)

    // Pre-fetch budget context when the user asks for budget suggestions
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    const lastUserText = (lastUserMsg?.parts?.find((p: any) => p.type === 'text') as any)?.text
      || (lastUserMsg as any)?.content || ''
    const isBudgetRequest = /suggest.*budget|budget.*adjust|budget.*optimi|rebalance.*budget|budget.*realloc/i.test(lastUserText as string)

    if (isBudgetRequest) {
      // Extract target month from message or default to current month
      const now = new Date()
      const monthMatch = (lastUserText as string).match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/i)
      let targetMonth: string
      if (monthMatch) {
        const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december']
        const mi = monthNames.indexOf(monthMatch[1].toLowerCase())
        targetMonth = `${monthMatch[2]}-${String(mi + 1).padStart(2, '0')}-01`
      } else {
        targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
      }

      try {
        const gatherTool = gatherBudgetContextTool(supabase, userId)
        const budgetContext = await (gatherTool as any).execute({ targetMonth })
        systemPrompt += `\n\n## Pre-fetched Budget Context for ${targetMonth}\nThe gather_budget_context data is already available below — do NOT call the tool again. Use this data to formulate your recommendations, then call \`propose_budget_changes\` with the structured changes.\n\n${JSON.stringify(budgetContext, null, 2)}`
      } catch (e) {
        app.log.error(e, 'Failed to pre-fetch budget context')
      }
    }

    const result = streamText({
      model: getModel(),
      system: systemPrompt,
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(5),
      toolChoice: 'auto',
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
