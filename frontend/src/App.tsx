import { BrowserRouter, Routes, Route } from 'react-router'
import { Toaster } from 'sonner'
import AppLayout from './components/layout/AppLayout'
import ChartPage from './pages/ChartPage'

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<ChartPage />} />
        </Routes>
      </AppLayout>
      <Toaster position="bottom-right" />
    </BrowserRouter>
  )
}

export default App
