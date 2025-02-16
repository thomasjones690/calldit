'use client'

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/lib/supabase/auth-context'
import { supabase } from '@/lib/supabase/client'
import { PredictionCard } from './PredictionCard'
import { Button } from './ui/button'
import { Textarea } from './ui/textarea'
import { useToast } from './ui/use-toast'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react'
import { type Prediction } from '../types'

interface Comment {
  id: string
  content: string
  user_id: string
  created_at: string
  updated_at: string
  display_name: string
}

export function PredictionView() {
  const { id: encodedContent } = useParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    fetchPrediction()
  }, [encodedContent])

  const fetchPrediction = async () => {
    if (!encodedContent) return

    const decodedContent = decodeURIComponent(encodedContent)
    
    const { data, error } = await supabase
      .from('predictions_with_profiles')
      .select('*')
      .ilike('content', decodedContent.replace(/-/g, ' '))
      .single()

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    setPrediction(data)
    fetchComments(data.id)
  }

  const fetchComments = async (predictionId: string) => {
    if (!predictionId) return
    
    const { data, error } = await supabase
      .from('comments_with_profiles')
      .select('*')
      .eq('prediction_id', predictionId)
      .order('created_at', { ascending: true })

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    setComments(data)
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !user) return

    const { error } = await supabase
      .from('comments')
      .insert([{
        prediction_id: prediction?.id,
        user_id: user?.id,
        content: newComment.trim()
      }])

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    setNewComment('')
    fetchComments(prediction?.id || '')
  }

  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return

    const { error } = await supabase
      .from('comments')
      .update({ 
        content: editContent.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    setEditingComment(null)
    setEditContent('')
    fetchComments(prediction?.id || '')
  }

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
      return
    }

    fetchComments(prediction?.id || '')
  }

  if (!prediction) return <div>Loading...</div>

  return (
    <div className="space-y-8">
      <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to predictions
      </Link>

      <PredictionCard 
        prediction={prediction}
        voteCounts={{ agrees: 0, disagrees: 0 }}
        onAddResult={() => {}}
        isOwner={user?.id === prediction.user_id}
        onVote={async () => {}}
        votes={{}}
        onLock={async () => {}}
        onEdit={() => {}}
      />

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Comments</h2>
        
        {user && (
          <div className="space-y-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment... (Markdown supported)"
              className="min-h-[100px]"
            />
            <Button onClick={handleSubmitComment}>Add Comment</Button>
          </div>
        )}

        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="border rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-medium">{comment.display_name}</span>
                  <span className="text-sm text-muted-foreground ml-2">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                {user?.id === comment.user_id && (
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingComment(comment.id)
                        setEditContent(comment.content)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {editingComment === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdateComment(comment.id)}>
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingComment(null)
                        setEditContent('')
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <ReactMarkdown className="prose dark:prose-invert">
                  {comment.content}
                </ReactMarkdown>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}