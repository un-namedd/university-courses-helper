import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { CookieConsentBanner } from './components/legal/CookieConsentBanner.tsx'
import { LegalPage } from './pages/LegalPage.tsx'
import { SharedPlanView } from './pages/SharedPlanView.tsx'

// Apply the persisted theme before first paint to avoid a flash of the wrong mode.
try {
  const saved = localStorage.getItem('uog-degree-planner')
  const theme = saved ? JSON.parse(saved)?.state?.theme : null
  document.documentElement.classList.toggle('dark', theme !== 'light')
} catch {
  document.documentElement.classList.add('dark')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/p/:shareId" element={<SharedPlanView />} />
        <Route path="/privacy" element={<LegalPage id="privacy" />} />
        <Route path="/terms" element={<LegalPage id="terms" />} />
        <Route path="/cookies" element={<LegalPage id="cookies" />} />
        <Route path="/legal-notice" element={<LegalPage id="legal-notice" />} />
      </Routes>
      <CookieConsentBanner />
    </BrowserRouter>
  </StrictMode>,
)
