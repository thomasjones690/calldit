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
import { Plus } from 'lucide-react'
import { AddPredictionDialog } from './AddPredictionDialog'
import { AddResultDialog } from './AddResultDialog'
import { CategorySelect } from './CategorySelect'
import { LoginDialog } from './LoginDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
import { PredictionCard } from './PredictionCard'
import { Prediction } from '@/types'

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
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [categories, setCategories] = useState<any[]>([])

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

  useEffect(() => {
    fetchCategories()
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
      
      const { data: predictions, error } = await supabase
        .from('predictions_with_profiles')
        .select(`
          id,
          content,
          user_id,
          is_locked,
          locked_at,
          result_text,
          is_correct,
          created_at,
          updated_at,
          end_date,
          display_name,
          category_id,
          category_name,
          categories (
            id,
            name,
            icon
          ),
          comments:comments(count)
        `)
        .order('created_at', { ascending: sortDirection === 'asc' })

      if (error) throw error

      const transformedData = predictions?.map((prediction: any) => ({
        ...prediction,
        category_name: prediction.categories?.name,
        category_icon: prediction.categories?.icon,
        user: {
          user_metadata: {
            display_name: prediction.display_name || 'Anonymous'
          }
        },
        commentCount: prediction.comments?.[0]?.count || 0
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
    
    console.log('Current user:', user)
    console.log('User ID being used:', user.id)
    
    const existingVote = votes[predictionId]
    const previousVotes = { ...votes }
    
    try {
      if (existingVote) {
        if (existingVote.type === voteType) {
          console.log('Deleting vote:', existingVote)
          const newVotes = { ...votes }
          delete newVotes[predictionId]
          setVotes(newVotes)

          const { error } = await supabase
            .from('prediction_votes')
            .delete()
            .eq('id', existingVote.id)

          if (error) {
            console.error('Delete vote error:', error)
            throw error
          }
          await fetchVoteCounts()
        } else {
          console.log('Updating vote:', { existingVote, newType: voteType })
          setVotes(prev => ({
            ...prev,
            [predictionId]: { 
              ...prev[predictionId],
              type: voteType 
            }
          }))

          const { error } = await supabase
            .from('prediction_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id)

          if (error) {
            console.error('Update vote error:', error)
            throw error
          }
          await fetchVoteCounts()
        }
        return
      }

      console.log('Creating new vote:', { 
        prediction_id: predictionId, 
        user_id: user.id,  // Check this value in console
        vote_type: voteType 
      })

      const { data, error } = await supabase
        .from('prediction_votes')
        .insert({
          prediction_id: predictionId,
          user_id: user.id,  // Make sure this matches the auth.uid() in the policy
          vote_type: voteType
        })
        .select()
        .single()

      if (error) {
        console.error('Insert vote error:', error)
        throw error
      }
      await fetchVoteCounts()

      setVotes(prev => ({
        ...prev,
        [predictionId]: { 
          type: voteType, 
          id: data.id 
        }
      }))

    } catch (error: any) {
      console.error('Vote error details:', {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      setVotes(previousVotes)
      toast({
        title: "Error",
        description: error.message || "Failed to update vote. Please try again.",
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

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, icon')
      .order('name')
    
    if (!error && data) {
      setCategories(data)
    }
  }

  const filterPredictions = (predictions: Prediction[]) => {
    return predictions.filter(prediction => {
      const matchesFilter = activeFilter === 'all' ||
        (activeFilter === 'mine' && prediction.user_id === user?.id) ||
        (activeFilter === 'awaiting' && !prediction.result_text) ||
        (activeFilter === 'correct' && prediction.is_correct === true) ||
        (activeFilter === 'incorrect' && prediction.is_correct === false)

      const matchesCategory = !selectedCategory || 
        selectedCategory === 'all' || 
        prediction.category_id === selectedCategory

      return matchesFilter && matchesCategory
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={activeFilter} onValueChange={(value: FilterType) => setActiveFilter(value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter predictions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Predictions</SelectItem>
              <SelectItem value="mine">My Predictions</SelectItem>
              <SelectItem value="awaiting">Awaiting Result</SelectItem>
              <SelectItem value="correct">Correct</SelectItem>
              <SelectItem value="incorrect">Incorrect</SelectItem>
            </SelectContent>
          </Select>
          
          <CategorySelect
            value={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>
        {user ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={sortDirection} onValueChange={(value: SortDirection) => setSortDirection(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
                </Select>
          <Button onClick={() => setIsAddingPrediction(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Prediction
          </Button>
          </div>
        ) : (
          <Button onClick={() => setIsLoginOpen(true)}>
            Sign in to add predictions
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {filterPredictions(getFilteredPredictions()).map((prediction) => (
          <PredictionCard
            key={prediction.id}
            prediction={prediction}
            voteCounts={voteCounts[prediction.id] || { agrees: 0, disagrees: 0 }}
            onAddResult={() => setAddingResultTo(prediction)}
            isOwner={user?.id === prediction.user_id}
            onVote={handleVote}
            votes={votes}
            onLock={handleLock}
            onEdit={(prediction) => setEditingPrediction(prediction)}
            commentCount={prediction.comments?.[0]?.count || 0}
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