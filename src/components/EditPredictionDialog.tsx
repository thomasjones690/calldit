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
import { CalendarIcon, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
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

  const handleDelete = async () => {
    // Optimistically remove the prediction
    setPredictions(prev => prev.filter(p => p.id !== prediction.id))
    onOpenChange(false)

    try {
      const { error } = await supabase
        .from('predictions')
        .delete()
        .eq('id', prediction.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Prediction deleted successfully.',
      })
    } catch (error: any) {
      // Fetch the predictions again if delete failed - this would be handled by the PredictionsList component's subscription
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
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
    <>
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
          <DialogFooter className="justify-between">
            {!prediction.is_locked && (
              <Button 
                variant="destructive" 
                onClick={() => setIsDeleteDialogOpen(true)}
                className="mr-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your prediction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
} 