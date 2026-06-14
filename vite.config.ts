import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { traeBadgePlugin } from 'vite-plugin-trae-solo-badge'
import path from 'path'

export default defineConfig({
  base: './',
  build: {
    sourcemap: 'hidden',
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  plugins: [
    react({
      babel: {
        plugins: ['react-dev-locator']
      }
    }),
    tsconfigPaths(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            sourcemap: true,
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron'
          }
        }
      }
    ]),
    renderer(),
    traeBadgePlugin({
      variant: 'dark',
      position: 'bottom-right',
      prodOnly: true,
      clickable: true,
      clickUrl: 'https://www.trae.ai/solo?showJoin=1',
      autoTheme: true,
      autoThemeTarget: '#root'
    })
  ],
  server: {
    port: 5173,
    strictPort: true
  }
})
