'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../lib/supabase/auth-context'
import { supabase } from '../lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'

export function DisplayNamePrompt() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()

      if (!error && (!data?.display_name || data.display_name.trim() === '')) {
        setOpen(true)
      }
    }

    checkProfile()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !displayName.trim()) return

    setIsLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() })
      .eq('id', user.id)

    setIsLoading(false)

    if (error) {
      toast({
        title: 'Error updating display name',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    setOpen(false)
    toast({
      title: 'Display name updated',
      description: 'Your display name has been set successfully.',
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Welcome! Set your display name</DialogTitle>
          <DialogDescription>
            Choose a display name that will be shown with your predictions.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your display name"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="submit"
              disabled={isLoading || !displayName.trim()}
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 