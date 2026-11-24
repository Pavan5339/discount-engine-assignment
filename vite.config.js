import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// BASE_PATH is set by the GitHub Pages workflow; local dev and Netlify use '/'.
export default defineConfig({ base: process.env.BASE_PATH || '/', plugins: [react()], server: { host: '127.0.0.1' } })
