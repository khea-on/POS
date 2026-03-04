import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const modeProxyTarget = mode === "local5012"
    ? "http://localhost:5012"
    : mode === "iis5000"
      ? "http://localhost:5000"
      : null
  const apiProxyTarget = env.VITE_API_PROXY_TARGET || modeProxyTarget || "http://localhost:5000"
  const appBase = env.VITE_APP_BASE || "/"

  return {
    plugins: [react()],
    base: appBase,
    server: {
      host: "localhost",
      port: 5174,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
