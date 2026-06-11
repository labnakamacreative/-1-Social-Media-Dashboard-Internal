import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // base path mengikuti nama repo agar asset termuat benar di GitHub Pages
  base: "/-1-Social-Media-Dashboard-Internal/",
  plugins: [react(), tailwindcss()],
})
