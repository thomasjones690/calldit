'use client'

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/supabase/auth-context'
import { Button } from './ui/button'
import { UserSettingsDialog } from './UserSettingsDialog'
import { Settings, LogOut } from 'lucide-react'
import { supabase } from '../lib/supabase/client'
import { PredictionStats } from './PredictionStats'

export function Header() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <>
      <header className="border-b">
        <div className="container mx-auto p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Predictometer</h1>
          {user && (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsSettingsOpen(true)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </header>
      <UserSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
      />
      <PredictionStats />
    </>
  )
} 