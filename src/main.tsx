import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import './theme.css'
import './extra.css'
import './landing.css'
import './heat.css'
import './buddy.css'
import './reader.css'
import './settings.css'
import './follow.css'
import './profile.css'
import './topic-strip.css'
import './room-form.css'
import './journey-capsules.css'
import './atmosphere.css'
import './blog-feed.css'
import './product-surfaces.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined))
}
