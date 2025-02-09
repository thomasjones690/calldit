import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/lib/supabase/auth-context'
import { AuthComponent } from '@/components/Auth'
import PredictionsPage from '@/app/predictions/page'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<AuthComponent />} />
          <Route path="/predictions" element={<PredictionsPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App 