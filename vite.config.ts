import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server-middleware',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // req.url contains query params in some environments, match start of path
          const url = req.url ? new URL(req.url, 'http://localhost').pathname : ''
          if (url === '/api/chat' && req.method === 'POST') {
            // Asynchronously handle the API call using SSR module loader
            server.ssrLoadModule('/api/chat.ts')
              .then((module) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                const handler = module.default
                if (typeof handler === 'function') {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                  return Promise.resolve(handler(req, res))
                } else {
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'API handler is not a function' }))
                }
              })
              .catch((error) => {
                console.error('API Error:', error)
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                const errorMessage = error instanceof Error ? error.message : 'Unknown API Error'
                res.end(JSON.stringify({ error: errorMessage }))
              })
          } else {
            next()
          }
        })
      },
    },
  ],
})

