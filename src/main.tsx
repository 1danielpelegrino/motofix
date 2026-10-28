import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import './website.css'
import { installRemoteStateSync } from './stateSync'

installRemoteStateSync()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
