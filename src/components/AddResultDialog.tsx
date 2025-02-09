// src/components/AddResultDialog.tsx
'use client'

import { useState } from 'react'
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
import { Textarea } from './ui/textarea'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { Prediction } from '../types'

interface AddResultDialogProps {
  prediction: Prediction
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (prediction: Prediction, explanation: string, isCorrect: boolean) => Promise<void>
}

export function AddResultDialog({ prediction, open, onOpenChange, onSave }: AddResultDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [resultText, setResultText] = useState('')
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !resultText.trim() || isCorrect === null) return

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('predictions')
        .update({
          result_text: resultText.trim(),
          is_correct: isCorrect,
          result_added_at: new Date().toISOString()
        })
        .eq('id', prediction.id)

      if (error) throw error

      toast({
        title: 'Result added',
        description: 'The prediction result has been recorded.',
      })
      onOpenChange(false)
      await onSave(prediction, resultText.trim(), isCorrect)
    } catch (error: any) {
      toast({
        title: 'Error adding result',
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
          <DialogTitle>Add Result</DialogTitle>
          <DialogDescription>
            Record the outcome of your prediction.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Original Prediction</Label>
              <p className="text-sm text-muted-foreground">{prediction.content}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="result">Result Explanation</Label>
              <Textarea
                id="result"
                value={resultText}
                onChange={(e) => setResultText(e.target.value)}
                placeholder="Explain what actually happened..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Was the prediction correct?</Label>
              <RadioGroup
                value={isCorrect?.toString()}
                onValueChange={(value) => setIsCorrect(value === 'true')}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="correct" />
                  <Label htmlFor="correct">Correct</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="incorrect" />
                  <Label htmlFor="incorrect">Incorrect</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !resultText.trim() || isCorrect === null}
            >
              {isSubmitting ? 'Adding...' : 'Add Result'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}