import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'
import { authMiddleware } from './auth/middleware.js'
import { healthRoutes } from './routes/health.js'
import { chatRoutes } from './routes/chat.js'

const app = Fastify({ logger: true })

const allowedOrigins = [
  'https://pachi-personal-finance-tracker.vercel.app',
  'https://personal-finance-app-v1-puce.vercel.app',
  'https://personal-finance-app-v1-kacinguyens-projects.vercel.app',
  'http://localhost:5173',
]

await app.register(cors, {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
  allowedHeaders: ['authorization', 'x-client-info', 'apikey', 'content-type'],
})

// Auth middleware for /api/* routes (except health)
app.addHook('onRequest', async (request, reply) => {
  if (request.url.startsWith('/api/') && request.url !== '/api/health') {
    await authMiddleware(request, reply)
  }
})

await app.register(healthRoutes)
await app.register(chatRoutes)

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  console.log(`Server running on port ${config.PORT}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
