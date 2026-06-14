import React from 'react'
import ReactDOM from 'react-dom/client'
import { AppRouter } from '@/router'
import { initializeMockData } from '@/utils/mock'
import '@/styles/globals.scss'

async function initApp() {
  try {
    await initializeMockData(import.meta.env.DEV)
  } catch (e) {
    console.error('Failed to initialize mock data:', e)
  }
}

initApp()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
)
