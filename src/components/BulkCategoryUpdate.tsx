'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from './ui/button'
import { CategorySelect } from './CategorySelect'
import { Card } from './ui/card'
import { toast } from './ui/use-toast'

export function BulkCategoryUpdate() {
  const [predictions, setPredictions] = useState<any[]>([])
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdminAndLoadPredictions()
  }, [])

  const checkAdminAndLoadPredictions = async () => {
    const { data: adminData } = await supabase
      .from('admins')
      .select('user_id')
      .single()
    
    if (!adminData) return

    setIsAdmin(true)
    const { data } = await supabase
      .from('predictions')
      .select('*')
      .is('category_id', null)
    
    if (data) setPredictions(data)
  }

  const updateCategory = async (predictionId: string, categoryId: string) => {
    const { error } = await supabase
      .from('predictions')
      .update({ category_id: categoryId })
      .eq('id', predictionId)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      setPredictions(prev => prev.filter(p => p.id !== predictionId))
      toast({
        title: 'Success',
        description: 'Category updated',
      })
    }
  }

  if (!isAdmin) return null

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Uncategorized Predictions ({predictions.length})</h2>
      {predictions.map(prediction => (
        <Card key={prediction.id} className="p-4">
          <p className="mb-2">{prediction.content}</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <CategorySelect
                onChange={(categoryId) => updateCategory(prediction.id, categoryId)}
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}