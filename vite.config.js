import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Replace 'YOUR_REPO_NAME' with your actual repository name on GitHub
  base: '/ScheduleMaker/',
})
