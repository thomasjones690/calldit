'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'
import { useAuth } from '../lib/supabase/auth-context'
import { CategorySelect } from './CategorySelect'
import { Label } from './ui/label'
import { Prediction } from '@/types'  // Use absolute import

interface AddPredictionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setPredictions: React.Dispatch<React.SetStateAction<Prediction[]>>
}

export function AddPredictionDialog({ open, onOpenChange, setPredictions }: AddPredictionDialogProps) {
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleSubmit = async () => {
    if (!user || !content.trim()) return

    // Fetch current display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    // Create optimistic prediction with actual display name
    const optimisticPrediction: Prediction = {
      id: crypto.randomUUID(),
      content: content.trim(),
      user_id: user.id,
      is_locked: false,
      locked_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        user_metadata: {
          display_name: profile?.display_name || 'Anonymous'
        }
      },
      category_id: categoryId,
      category_name: '', // Will be updated by realtime subscription
    }

    // Add to list immediately
    setPredictions(prev => [optimisticPrediction, ...prev])
    
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('predictions')
        .insert([{
          content: content.trim(),
          user_id: user.id,
          category_id: categoryId || null,
        }])
        .select()

      if (error) throw error

      setContent('')
      onOpenChange(false)
      toast({
        title: 'Success',
        description: 'Your prediction has been added.',
      })
    } catch (error: any) {
      // Remove optimistic prediction on error
      setPredictions(prev => prev.filter(p => p.id !== optimisticPrediction.id))
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Prediction</DialogTitle>
        </DialogHeader>
        <div className="py-4 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <CategorySelect
              value={categoryId}
              onChange={setCategoryId}
            />
          </div>
          <Textarea
            placeholder="Enter your prediction..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !content.trim()}>
            {isSubmitting ? 'Adding...' : 'Add Prediction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 