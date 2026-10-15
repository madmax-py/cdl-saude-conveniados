import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Em desenvolvimento o Vite repassa /api (e /rails, das fotos de perfil) para o
// Rails. Assim o navegador vê tudo na mesma origem e não precisa de CORS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = env.BACKEND_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': backend,
        '/rails': backend,
      },
    },
  }
})
