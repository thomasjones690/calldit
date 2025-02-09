'use client'

import { useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'
import { useAuth } from '../lib/supabase/auth-context'

export function AddPredictionForm() {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('predictions')
        .insert([
          {
            content,
            user_id: user.id,
          },
        ])
        .select()

      if (error) throw error

      setContent('')
      toast({
        title: 'Success',
        description: 'Your prediction has been added.',
      })
    } catch (error: any) {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Enter your prediction..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[100px]"
      />
      <Button type="submit" disabled={isSubmitting || !content.trim()}>
        {isSubmitting ? 'Adding...' : 'Add Prediction'}
      </Button>
    </form>
  )
} 