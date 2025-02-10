'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../lib/supabase/auth-context'
import { supabase } from '../lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from './ui/dialog'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'
import { LogOut } from 'lucide-react'

interface UserSettingsDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface Profile {
  id: string
  display_name: string
  total_points: number
  total_correct: number
  // ... other profile fields
}

export function UserSettingsDialog({ open, onOpenChange }: UserSettingsDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (open && user) {
      const fetchProfile = async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error fetching profile:', error)
          return
        }

        if (data) {
          setProfile(data)
          setDisplayName(data.display_name || '')
        }
      }

      fetchProfile()
    }
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !displayName.trim()) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          display_name: displayName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: 'Profile updated',
        description: 'Your display name has been updated successfully.',
      })
      onOpenChange?.(false)
    } catch (error: any) {
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      onOpenChange?.(false)
    }
  }

  return (
    <Dialog modal open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            View and update your profile information.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6">
          {/* User Info Section */}
          <div className="grid gap-2">
            <h3 className="font-semibold">Account Information</h3>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="text-muted-foreground">Email:</span>
              <span>{user?.email}</span>
              <span className="text-muted-foreground">Member since:</span>
              <span>{new Date(user?.created_at || '').toLocaleDateString()}</span>
              <span className="text-muted-foreground">Last sign in:</span>
              <span>{new Date(user?.last_sign_in_at || '').toLocaleDateString()}</span>
            </div>
          </div>

          {/* Display Name Form */}
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
              <p className="text-sm text-muted-foreground">
                This is how you'll appear to other users.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>

          {/* Updated Stats Section */}
          <div className="grid gap-2">
            <h3 className="font-semibold">Your Stats</h3>
            <div className="grid grid-cols-2 gap-1 text-sm">
              <span className="text-muted-foreground">Total Points:</span>
              <span>{profile?.total_points || 0}</span>
              <span className="text-muted-foreground">Correct Predictions:</span>
              <span>{profile?.total_correct || 0}</span>
              <span className="text-muted-foreground">Total Predictions:</span>
              <span>Coming soon</span>
              <span className="text-muted-foreground">Locked Predictions:</span>
              <span>Coming soon</span>
            </div>
          </div>

          {/* Add Sign Out Button */}
          <div className="border-t pt-4">
            <Button 
              variant="destructive" 
              onClick={handleSignOut}
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 