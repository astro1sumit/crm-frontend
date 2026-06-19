import React from 'react'
import ReactDOM from 'react-dom/client'
import LeadsDashboard from './LeadsDashboard'

// It MUST look exactly like this, searching for 'root'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LeadsDashboard />
  </React.StrictMode>
)