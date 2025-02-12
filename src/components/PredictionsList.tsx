'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'
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
import { Plus, ArrowUpDown} from 'lucide-react'
import { AddPredictionDialog } from './AddPredictionDialog'
import { AddResultDialog } from './AddResultDialog'
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group'
import { LoginDialog } from './LoginDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { PredictionCard } from './PredictionCard'

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
  category?: string
  category_name: string
  display_name?: string
  categories?: {
    id: string
    name: string
    icon?: string
  }
}

type SortDirection = 'desc' | 'asc'
type FilterType = 'all' | 'mine' | 'awaiting' | 'correct' | 'incorrect'
type VoteCounts = Record<string, { agrees: number, disagrees: number }>

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
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [votes, setVotes] = useState<Record<string, { type: 'agree' | 'disagree', id: string }>>({})
  const [voteCounts, setVoteCounts] = useState<VoteCounts>({})

  useEffect(() => {
    if (!user && activeFilter === 'mine') {
      setActiveFilter('all')
    }
  }, [user, activeFilter])

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

  useEffect(() => {
    fetchVotes()
    
    const channel = supabase
      .channel('votes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prediction_votes',
        },
        () => {
          fetchVotes()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  useEffect(() => {
    fetchVoteCounts()
    
    const channel = supabase
      .channel('vote_counts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prediction_votes',
        },
        () => {
          fetchVoteCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
        // First filter out locked predictions that aren't yours
        if (!prediction.is_locked && prediction.user_id !== user?.id) {
          return false
        }

        // Then apply the selected filter
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
      const { data: predictions } = await supabase
        .from('predictions_with_profiles')
        .select(`
          id,
          content,
          user_id,
          is_locked,
          result_text,
          is_correct,
          display_name,
          category_id,
          category_name,
          categories (
            id,
            name,
            icon
          )
        `)
        .order('created_at', { ascending: sortDirection === 'asc' })

      console.log('Full query result:', { data: predictions, error: null })

      if (!predictions) {
        throw new Error('Failed to fetch predictions')
      }

      const transformedData = predictions?.map((prediction: any) => ({
        ...prediction,
        category: prediction.category_name,
        user: {
          user_metadata: {
            display_name: prediction.display_name || 'Anonymous'
          }
        }
      }))

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

  const fetchVotes = async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('prediction_votes')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching votes:', error)
      return
    }

    const votesMap = data.reduce((acc, vote) => ({
      ...acc,
      [vote.prediction_id]: { type: vote.vote_type, id: vote.id }
    }), {})
    setVotes(votesMap)
  }

  const fetchVoteCounts = async () => {
    const { data, error } = await supabase
      .from('prediction_votes')
      .select('prediction_id, vote_type')

    if (error) {
      console.error('Error fetching vote counts:', error)
      return
    }

    const counts = data.reduce((acc, vote) => {
      if (!acc[vote.prediction_id]) {
        acc[vote.prediction_id] = { agrees: 0, disagrees: 0 }
      }
      if (vote.vote_type === 'agree') {
        acc[vote.prediction_id].agrees++
      } else {
        acc[vote.prediction_id].disagrees++
      }
      return acc
    }, {} as VoteCounts)

    setVoteCounts(counts)
  }

  const handleVote = async (predictionId: string, voteType: 'agree' | 'disagree') => {
    if (!user) return
    
    const existingVote = votes[predictionId]
    const previousVotes = { ...votes }
    
    try {
      if (existingVote) {
        // Optimistically remove vote if clicking the same button
        if (existingVote.type === voteType) {
          // Optimistically update UI
          const newVotes = { ...votes }
          delete newVotes[predictionId]
          setVotes(newVotes)

          // Attempt server update
          const { error } = await supabase
            .from('prediction_votes')
            .delete()
            .eq('id', existingVote.id)

          if (error) throw error
        }
        return // Don't allow changing vote type
      }

      // Optimistically add new vote
      setVotes(prev => ({
        ...prev,
        [predictionId]: { 
          type: voteType, 
          id: 'temp-id' // Temporary ID until server responds
        }
      }))

      // Attempt server update
      const { data, error } = await supabase
        .from('prediction_votes')
        .insert({
          prediction_id: predictionId,
          user_id: user.id,
          vote_type: voteType
        })
        .select()
        .single()

      if (error) throw error

      // Update with real ID from server
      setVotes(prev => ({
        ...prev,
        [predictionId]: { 
          type: voteType, 
          id: data.id 
        }
      }))

    } catch (error) {
      // Revert to previous state on error
      setVotes(previousVotes)
      toast({
        title: "Error",
        description: "Failed to update vote. Please try again.",
        variant: "destructive"
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
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Predictions</h2>
        {user ? (
          <Button onClick={() => setIsAddingPrediction(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Prediction
          </Button>
        ) : (
          <Button onClick={() => setIsLoginOpen(true)}>
            Sign in to add predictions
          </Button>
        )}
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="block sm:hidden w-48">
          <Select
            value={activeFilter}
            onValueChange={(value: FilterType) => setActiveFilter(value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {user && <SelectItem value="mine">Mine</SelectItem>}
              <SelectItem value="awaiting">Awaiting</SelectItem>
              <SelectItem value="correct">Correct</SelectItem>
              <SelectItem value="incorrect">Incorrect</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="hidden sm:block">
          <ToggleGroup 
            type="single" 
            value={activeFilter}
            onValueChange={(value: FilterType) => setActiveFilter(value || 'all')}
            className="justify-start"
          >
            <ToggleGroupItem value="all" aria-label="Show all predictions">
              All
            </ToggleGroupItem>
            {user && (
              <ToggleGroupItem value="mine" aria-label="Show my predictions">
                Mine
              </ToggleGroupItem>
            )}
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
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
        >
          <ArrowUpDown className="h-4 w-4 mr-2" />
          {sortDirection === 'desc' ? 'Newest First' : 'Oldest First'}
        </Button>
      </div>

      <div className="space-y-4">
        {getFilteredPredictions().map((prediction) => (
          <PredictionCard
            key={prediction.id}
            prediction={prediction}
            voteCounts={voteCounts[prediction.id] || { agrees: 0, disagrees: 0 }}
            onAddResult={() => setAddingResultTo(prediction)}
            isOwner={user?.id === prediction.user_id}
            onVote={handleVote}
            votes={votes}
          />
        ))}
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
          setPredictions={setPredictions}
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

      <LoginDialog
        open={isLoginOpen}
        onOpenChange={setIsLoginOpen}
      />
    </div>
  )
} 