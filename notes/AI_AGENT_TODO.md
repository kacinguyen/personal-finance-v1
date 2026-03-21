# AI Agent Architecture & To-Do List

## Context
Add AI agents to the personal finance app: chat about finances, auto-categorize transactions, surface insights, and take actions. Powered by a pluggable LLM provider (Claude/OpenAI) running on a separate Node.js backend.

---

## Tech Choices

| Component | Choice | Why |
|-----------|--------|-----|
| HTTP framework | **Fastify** | TypeScript-first, built-in streaming, schema validation |
| LLM SDK | **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/openai`) | Provider-agnostic streaming + tool use. Much lighter than LangChain. |
| Frontend chat | **`@ai-sdk/react`** `useChat` hook | Native SSE streaming, handles message state |
| Validation | **Zod** | Runtime type safety, integrates with Vercel AI SDK tool definitions |
| Dev runner | **tsx** (dev), **tsup** (build) | Fast TypeScript execution |

---

## Backend Structure

```
server/
  src/
    index.ts                     # Fastify bootstrap, CORS, route registration
    config.ts                    # Env var loading + Zod validation
    auth/middleware.ts           # JWT validation via supabase.auth.getUser()
    llm/provider.ts              # getModel() factory — Claude or OpenAI
    supabase/client.ts           # createServiceClient() (service role, bypasses RLS)
    system-prompts/chat.ts       # Financial assistant system prompt
    system-prompts/categorize.ts # Batch categorization prompt
    tools/
      index.ts                   # createTools(supabase, userId) registry
      query-transactions.ts      # Search/filter transactions
      get-monthly-summary.ts     # Pre-aggregated monthly data
      get-category-spending.ts   # Per-category breakdown
      get-accounts.ts            # Accounts + balances
      get-budgets.ts             # Budget status
      get-goals.ts               # Goal progress
      get-paystubs.ts            # Income history
      categorize-transaction.ts  # Assign category (write)
      update-transaction.ts      # Update notes/tags (write)
    routes/
      health.ts                  # GET /api/health
      chat.ts                    # POST /api/chat (SSE stream)
      categorize.ts              # POST /api/categorize (batch)
```

---

## Auth Flow

1. Frontend gets JWT from existing `AuthContext` (`session.access_token`)
2. Sends `Authorization: Bearer <jwt>` to backend
3. Backend validates via `supabase.auth.getUser(token)` (same pattern as `supabase/functions/_shared/auth.ts`)
4. `userId` attached to request, passed to all tool executions (never exposed to LLM)

---

## Frontend Changes

- `src/lib/agentApi.ts` — base URL + auth header helper
- `src/hooks/useFinanceChat.ts` — wraps `@ai-sdk/react` `useChat`
- `src/components/ChatPanel.tsx` — floating slide-in panel (framer-motion)
- `src/components/ChatMessage.tsx` + `ChatInput.tsx` — chat UI
- Add floating chat button to `App.tsx`
- Vite proxy: `/api` → `localhost:3001` for dev

---

## Key Files to Reference

- `supabase/functions/_shared/auth.ts` — auth pattern to replicate
- `src/contexts/AuthContext.tsx` — provides `session.access_token`
- `src/types/monthlySummary.ts` — primary data type for AI queries
- `src/types/transaction.ts` — transaction schema for tool definitions
- `src/App.tsx` — where ChatPanel integrates

---

## Phased To-Do List

### Phase 1: Backend Skeleton
- [ ] Create `server/package.json` with deps: `fastify`, `@fastify/cors`, `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@supabase/supabase-js`, `zod`, `dotenv`; dev deps: `tsx`, `tsup`, `typescript`, `@types/node`
- [ ] Create `server/tsconfig.json`
- [ ] Create `server/.env.example` (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, DEFAULT_LLM_PROVIDER, PORT)
- [ ] Implement `config.ts` — Zod-validated env loading
- [ ] Implement `supabase/client.ts` — service role client
- [ ] Implement `auth/middleware.ts` — JWT validation
- [ ] Implement `index.ts` — Fastify bootstrap with CORS + auth
- [ ] Implement `routes/health.ts`
- [ ] Verify: server starts, health returns 200, bad JWTs rejected

### Phase 2: LLM Provider + Chat Endpoint
- [ ] Implement `llm/provider.ts` — `getModel()` factory for Claude/OpenAI
- [ ] Implement `system-prompts/chat.ts` — financial assistant prompt
- [ ] Implement `routes/chat.ts` — streaming chat via `streamText()` + `toDataStream()`
- [ ] Test with curl: send message with valid JWT, verify SSE stream

### Phase 3: Read-Only Tools
- [ ] Implement all 7 read tools (query-transactions, get-monthly-summary, get-category-spending, get-accounts, get-budgets, get-goals, get-paystubs)
- [ ] Implement `tools/index.ts` — registry
- [ ] Wire tools into chat route
- [ ] Test: "How much did I spend this month?" triggers tool call and returns real data

### Phase 4: Frontend Chat UI
- [ ] Add `@ai-sdk/react` to frontend deps
- [ ] Implement `agentApi.ts`, `useFinanceChat.ts`
- [ ] Implement `ChatPanel.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`
- [ ] Add floating chat button + panel to `App.tsx`
- [ ] Add Vite proxy config for `/api` → `localhost:3001`
- [ ] Verify: end-to-end streaming chat in browser

### Phase 5: Write Tools + Auto-Categorize
- [ ] Implement `categorize-transaction.ts` and `update-transaction.ts` tools
- [ ] Implement `system-prompts/categorize.ts` + `routes/categorize.ts`
- [ ] Add "Auto-categorize" button to TransactionsView
- [ ] Test: uncategorized transactions get assigned categories

### Phase 6: Polish
- [ ] Rate limiting (`@fastify/rate-limit`)
- [ ] Request logging
- [ ] Error handling middleware
- [ ] Conversation history (localStorage v1)

---

## Verification

1. `cd server && npm run dev` starts Fastify on port 3001
2. `curl localhost:3001/api/health` returns `{ "status": "ok" }`
3. `curl -H "Authorization: Bearer <jwt>" localhost:3001/api/chat -d '{"messages":[{"role":"user","content":"hi"}]}'` streams a response
4. Frontend chat panel opens, sends message, receives streamed AI response with real financial data
5. Auto-categorize endpoint correctly categorizes uncategorized transactions
