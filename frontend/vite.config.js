import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This outputs the build directly into Maven's target static folder
    outDir: '../target/classes/static',
    emptyOutDir: true, 
  }
})
