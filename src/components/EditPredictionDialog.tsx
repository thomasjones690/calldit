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
import { Prediction } from '../types'

interface EditPredictionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prediction: Prediction
  setPredictions: React.Dispatch<React.SetStateAction<Prediction[]>>
}

export function EditPredictionDialog({ open, onOpenChange, prediction, setPredictions }: EditPredictionDialogProps) {
  const [content, setContent] = useState(prediction.content)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleUpdate = async () => {
    if (!content.trim()) return

    // Optimistically update the prediction
    setPredictions(prev => prev.map(p => 
      p.id === prediction.id 
        ? { ...p, content: content.trim(), updated_at: new Date().toISOString() }
        : p
    ))

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('predictions')
        .update({ content: content.trim() })
        .eq('id', prediction.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Prediction updated successfully.',
      })
      onOpenChange(false)
    } catch (error: any) {
      // Revert optimistic update
      setPredictions(prev => prev.map(p => 
        p.id === prediction.id 
          ? { ...p, content: prediction.content }
          : p
      ))
      toast({
        title: 'Error updating prediction',
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
          <DialogTitle>Edit Prediction</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 