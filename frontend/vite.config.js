import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Outputs directly to Spring Boot's static resources folder
    outDir: '../src/main/resources/static',
    emptyOutDir: true, 
  }
})