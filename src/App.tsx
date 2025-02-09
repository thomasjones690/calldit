import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/supabase/auth-context'
import { AuthComponent } from './components/Auth'
import { Header } from './components/Header'
import PredictionsPage from './pages/predictions'
import { Toaster } from './components/ui/toaster'
import { useAuth } from './lib/supabase/auth-context'
import { DisplayNamePrompt } from './components/DisplayNamePrompt'

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<AuthComponent />} />
              <Route 
                path="/predictions" 
                element={
                  <ProtectedRoute>
                    <PredictionsPage />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </main>
          <DisplayNamePrompt />
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
