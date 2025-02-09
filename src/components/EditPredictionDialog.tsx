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

interface EditPredictionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prediction: {
    id: string
    content: string
  }
}

export function EditPredictionDialog({ open, onOpenChange, prediction }: EditPredictionDialogProps) {
  const [content, setContent] = useState(prediction.content)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleUpdate = async () => {
    setIsSubmitting(true)
    const { error } = await supabase
      .from('predictions')
      .update({ content })
      .eq('id', prediction.id)

    setIsSubmitting(false)

    if (error) {
      toast({
        title: 'Error updating prediction',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    toast({
      title: 'Prediction updated',
      description: 'Your prediction has been updated successfully.',
    })
    onOpenChange(false)
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