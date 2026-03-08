import { openai } from '@ai-sdk/openai'

export function getModel() {
  return openai('gpt-4o')
}

export const MODEL_CONFIG = {
  temperature: 0.3,
  maxTokens: 2048,
} as const
