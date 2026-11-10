import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { crearHandler } from './server/lugares.mjs'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), {
      name: 'api-lugares-local',
      configureServer(server) {
        const handler = crearHandler({ env })
        server.middlewares.use((req, res, next) => {
          if (req.url.split('?')[0] !== '/api/lugares') return next()
          res.status = codigo => { res.statusCode = codigo; return res }
          res.json = datos => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(datos)) }
          void handler(req, res)
        })
      },
    }],
  }
})
