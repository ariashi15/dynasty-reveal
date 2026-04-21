import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const DYNASTIES_ROOT_PATH = '/dynasties'
const normalizedPath = window.location.pathname.replace(/\/+$/, '') || '/'

if (normalizedPath === '/') {
  window.history.replaceState(null, '', `${DYNASTIES_ROOT_PATH}${window.location.search}${window.location.hash}`)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
