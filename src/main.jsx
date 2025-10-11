import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import { CSRFProvider } from './context/CSRFContext'
import { store } from './redux/store'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <CSRFProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </CSRFProvider>
    </Provider>
  </StrictMode>,
)