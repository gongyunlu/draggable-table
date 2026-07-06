import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { TABLE_VERSION } from '@draggable-table/table'
import '@draggable-table/theme'

function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 32 }}>
      <h1>Hello Draggable Table</h1>
      <p>Playground alive. Table package version: {TABLE_VERSION}</p>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('root element missing')
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
