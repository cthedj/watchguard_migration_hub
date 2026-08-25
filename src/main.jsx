import React from 'react'
import ReactDOM from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import App from './App'
import AuthGate from './auth/AuthGate'
import { msalInstance } from './auth/msal'
import { runtimeConfig } from './config/runtime'
import './styles.css'

const app = (
  <AuthGate>
    <App />
  </AuthGate>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {runtimeConfig.authMode === 'entra'
      ? <MsalProvider instance={msalInstance}>{app}</MsalProvider>
      : app}
  </React.StrictMode>,
)
