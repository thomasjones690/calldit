'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'
import { Card } from './ui/card'
import { useAuth } from '../lib/supabase/auth-context'
import { EditPredictionDialog } from './EditPredictionDialog'
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
import { Edit, Trash2, Lock, Plus, ArrowUpDown } from 'lucide-react'
import { AddPredictionDialog } from './AddPredictionDialog'
import { AddResultDialog } from './AddResultDialog'
import { CheckCircle2, XCircle } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'

type Prediction = {
  id: string
  content: string
  user_id: string
  is_locked: boolean
  created_at: string
  updated_at: string
  result_text?: string
  is_correct?: boolean
  result_added_at?: string
  user: {
    user_metadata: {
      display_name: string
    }
  }
}

type SortDirection = 'desc' | 'asc'
type FilterType = 'all' | 'mine' | 'awaiting' | 'correct' | 'incorrect'

export function PredictionsList() {
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const { toast } = useToast()
  const { user } = useAuth()
  const [editingPrediction, setEditingPrediction] = useState<Prediction | null>(null)
  const [deletingPrediction, setDeletingPrediction] = useState<Prediction | null>(null)
  const [isAddingPrediction, setIsAddingPrediction] = useState(false)
  const [addingResultTo, setAddingResultTo] = useState<Prediction | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')

  useEffect(() => {
    console.log('Component mounted, fetching initial data...')
    fetchPredictions()
    
    console.log('Setting up realtime subscription...')
    const channel = setupRealtimeSubscription()
    
    return () => {
      console.log('Component unmounting, cleaning up...')
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('predictions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictions_with_profiles'
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the complete prediction with profile data
            const { data: newPrediction } = await supabase
              .from('predictions_with_profiles')
              .select('*')
              .eq('id', payload.new.id)
              .single()

            if (newPrediction) {
              setPredictions(prev => [{
                ...newPrediction,
                user: {
                  user_metadata: {
                    display_name: newPrediction.display_name || 'Anonymous'
                  }
                }
              }, ...prev])
            }
          } else if (payload.eventType === 'UPDATE') {
            setPredictions(prev => 
              prev.map(prediction => 
                prediction.id === payload.new.id 
                  ? {
                      ...(payload.new as Prediction),
                      user: {
                        user_metadata: {
                          display_name: payload.new.display_name || 'Anonymous'
                        }
                      }
                    }
                  : prediction
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setPredictions(prev => 
              prev.filter(prediction => prediction.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return channel
  }

  const getFilteredPredictions = () => {
    return predictions
      .filter(prediction => {
        switch (activeFilter) {
          case 'mine':
            return prediction.user_id === user?.id
          case 'awaiting':
            return prediction.is_locked && !prediction.result_text
          case 'correct':
            return prediction.is_correct === true
          case 'incorrect':
            return prediction.is_correct === false
          default:
            return true
        }
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime()
        const dateB = new Date(b.created_at).getTime()
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB
      })
  }

  const fetchPredictions = async () => {
    try {
      console.log('Fetching predictions...')
      
      // First, let's try a simple query to test basic access
      const testQuery = await supabase
        .from('predictions')
        .select('*')
        .limit(1)
      
      console.log('Test query result:', testQuery)

      if (testQuery.error) {
        console.error('Test query failed:', testQuery.error)
        throw testQuery.error
      }

      // Now try the full query with joins
      const { data, error } = await supabase
        .from('predictions_with_profiles')
        .select(`
          id,
          content,
          user_id,
          is_locked,
          created_at,
          updated_at,
          result_text,
          is_correct,
          result_added_at,
          display_name
        `)
        .order('created_at', { ascending: sortDirection === 'asc' })

      console.log('Full query result:', { data, error })

      if (error) {
        console.error('Full query failed:', error)
        throw error
      }

      const transformedData = data?.map((prediction: any) => {
        console.log('Processing prediction:', prediction)
        return {
          ...prediction,
          user: {
          user_metadata: {
            display_name: prediction.display_name || 'Anonymous'
          }
        }
        }
      })

      console.log('Transformed data:', transformedData)
      setPredictions(transformedData || [])
    } catch (error: any) {
      console.error('Error in fetchPredictions:', error)
      toast({
        title: 'Error fetching predictions',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  useEffect(() => {
    fetchPredictions()
  }, [sortDirection])

  const handleDelete = async (id: string) => {
    // Optimistically remove the prediction
    setPredictions(prev => prev.filter(p => p.id !== id))

    try {
      const { error } = await supabase
        .from('predictions')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Prediction deleted successfully.',
      })
    } catch (error: any) {
      // Fetch the predictions again if delete failed
      fetchPredictions()
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleLock = async (prediction: Prediction) => {
    // Optimistically update the prediction
    setPredictions(prev => prev.map(p => 
      p.id === prediction.id 
        ? { ...p, is_locked: true, locked_at: new Date().toISOString() }
        : p
    ))

    try {
      const { error } = await supabase
        .from('predictions')
        .update({ 
          is_locked: true,
          locked_at: new Date().toISOString()
        })
        .eq('id', prediction.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Prediction locked successfully.',
      })
    } catch (error: any) {
      // Revert the optimistic update if it failed
      setPredictions(prev => prev.map(p => 
        p.id === prediction.id 
          ? { ...p, is_locked: false, locked_at: null }
          : p
      ))
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleSaveExplanation = async (prediction: Prediction, explanation: string, isCorrect: boolean) => {
    // Optimistically update the prediction
    setPredictions(prev => prev.map(p => 
      p.id === prediction.id 
        ? { 
            ...p, 
            result_text: explanation,
            is_correct: isCorrect,
            result_added_at: new Date().toISOString()
          }
        : p
    ))

    try {
      const { error } = await supabase
        .from('predictions')
        .update({ 
          result_text: explanation,
          is_correct: isCorrect,
          result_added_at: new Date().toISOString()
        })
        .eq('id', prediction.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Explanation saved successfully.',
      })
    } catch (error: any) {
      // Revert the optimistic update if it failed
      setPredictions(prev => prev.map(p => 
        p.id === prediction.id 
          ? { 
              ...p, 
              result_text: prediction.result_text,
              is_correct: prediction.is_correct,
              result_added_at: prediction.result_added_at
            }
          : p
      ))
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Predictions</h2>
          <Button onClick={() => setIsAddingPrediction(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Prediction
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <ToggleGroup 
            type="single" 
            value={activeFilter}
            onValueChange={(value: FilterType) => setActiveFilter(value || 'all')}
            className="justify-start"
          >
            <ToggleGroupItem value="all" aria-label="Show all predictions">
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="mine" aria-label="Show my predictions">
              Mine
            </ToggleGroupItem>
            <ToggleGroupItem value="awaiting" aria-label="Show predictions awaiting results">
              Awaiting
            </ToggleGroupItem>
            <ToggleGroupItem value="correct" aria-label="Show correct predictions">
              Correct
            </ToggleGroupItem>
            <ToggleGroupItem value="incorrect" aria-label="Show incorrect predictions">
              Incorrect
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="ml-auto"
          >
            <ArrowUpDown className="h-4 w-4 mr-2" />
            {sortDirection === 'desc' ? 'Newest First' : 'Oldest First'}
          </Button>
        </div>

        {getFilteredPredictions().length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">
              {activeFilter === 'all' 
                ? 'No predictions yet. Be the first to add one!'
                : 'No predictions match the selected filter.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {getFilteredPredictions().map((prediction) => (
              <Card key={prediction.id} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <p className="text-lg">{prediction.content}</p>
                    {prediction.result_text && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Result:</span>
                          {prediction.is_correct ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{prediction.result_text}</p>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <span>{prediction.user?.user_metadata?.display_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{new Date(prediction.created_at).toLocaleDateString()}</span>
                      {prediction.is_locked && (
                        <>
                          <span>•</span>
                          <Lock className="h-4 w-4" />
                          <span>Locked</span>
                        </>
                      )}
                    </div>
                  </div>
                  {user?.id === prediction.user_id && !prediction.is_locked && (
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingPrediction(prediction)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingPrediction(prediction)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLock(prediction)}
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  {user?.id === prediction.user_id && prediction.is_locked && !prediction.result_text && (
                    <Button
                      variant="outline"
                      onClick={() => setAddingResultTo(prediction)}
                    >
                      Add Result
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddPredictionDialog
        open={isAddingPrediction}
        onOpenChange={setIsAddingPrediction}
        setPredictions={setPredictions}
      />

      {editingPrediction && (
        <EditPredictionDialog
          open={!!editingPrediction}
          onOpenChange={(open) => !open && setEditingPrediction(null)}
          prediction={editingPrediction}
        />
      )}

      <AlertDialog
        open={!!deletingPrediction}
        onOpenChange={(open) => !open && setDeletingPrediction(null)}
      >
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
              onClick={() => deletingPrediction && handleDelete(deletingPrediction.id)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {addingResultTo && (
        <AddResultDialog
          prediction={addingResultTo}
          open={!!addingResultTo}
          onOpenChange={(open) => !open && setAddingResultTo(null)}
          onSave={handleSaveExplanation}
        />
      )}
    </>
  )
} 