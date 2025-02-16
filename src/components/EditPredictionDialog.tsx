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
import { CategorySelect } from './CategorySelect'
import { Label } from './ui/label'
import { Calendar } from "./ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface EditPredictionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prediction: Prediction
  setPredictions: React.Dispatch<React.SetStateAction<Prediction[]>>
}

export function EditPredictionDialog({ open, onOpenChange, prediction, setPredictions }: EditPredictionDialogProps) {
  const [content, setContent] = useState(prediction.content)
  const [categoryId, setCategoryId] = useState(prediction.category_id)
  const [endDate, setEndDate] = useState<Date>(() => {
    try {
      // Try to parse the date, fallback to current date if invalid
      const date = prediction.end_date ? new Date(prediction.end_date) : new Date()
      return isNaN(date.getTime()) ? new Date() : date
    } catch (e) {
      console.error('Error parsing date:', e)
      return new Date()
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const handleUpdate = async () => {
    if (!content.trim() || !endDate) return

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
        .update({ 
          content: content.trim(),
          category_id: categoryId,
          end_date: endDate.toISOString(),
          updated_at: new Date().toISOString()
        })
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

  // Format date for input
  const formatDateForInput = (date: Date) => {
    try {
      return date.toISOString().split('.')[0]
    } catch (e) {
      console.error('Error formatting date:', e)
      return new Date().toISOString().split('.')[0]
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Prediction</DialogTitle>
        </DialogHeader>
        <div className="py-4 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <CategorySelect
              value={categoryId || ''}
              onChange={setCategoryId}
            />
          </div>
          <div className="grid gap-2">
            <Label>End Date</Label>
            <Popover modal={true}>
              <PopoverTrigger>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date: Date | undefined) => date && setEndDate(date)}
                  initialFocus
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>
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