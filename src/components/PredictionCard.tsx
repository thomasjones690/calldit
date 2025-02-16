import { useState } from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { ThumbsUp, ThumbsDown, Medal, Share, MessageSquare, Lock, Edit } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"
import React from 'react'
import { AVAILABLE_ICONS } from './CategoryManagement'  // Import the icons map
import { format } from 'timeago.js'
import { Prediction } from '../types'  // Add this import
import { Link } from 'react-router-dom'

interface PredictionCardProps {
  prediction: Prediction
  voteCounts: {
    agrees: number
    disagrees: number
  }
  onAddResult: () => void
  isOwner: boolean
  onVote: (predictionId: string, voteType: 'agree' | 'disagree') => Promise<void>
  votes: Record<string, { type: 'agree' | 'disagree', id: string }>
  onLock: (prediction: Prediction) => Promise<void>
  onEdit: (prediction: Prediction) => void
  commentCount?: number
}

export function PredictionCard({ prediction, voteCounts, onAddResult, isOwner, onVote, votes, onLock, onEdit, commentCount = 0 }: PredictionCardProps) {
  const getCardClassName = () => {
    if (prediction.result_text) {
      return prediction.is_correct
        ? "p-4 border-green-500 bg-green-50 dark:bg-green-950/20"
        : "p-4 border-red-500 bg-red-50 dark:bg-red-950/20"
    }
    return "p-4"
  }

  console.log('Prediction data:', {
    category: prediction.category,
    category_name: prediction.category_name
  });

  return (
    <Card className={getCardClassName()}>
      <div className="flex flex-col gap-2">
        {/* Category and Actions Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {prediction.category_icon && (
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <span className="w-4 h-4">
                  {AVAILABLE_ICONS[prediction.category_icon as keyof typeof AVAILABLE_ICONS] && 
                    React.createElement(
                      AVAILABLE_ICONS[prediction.category_icon as keyof typeof AVAILABLE_ICONS], 
                      { className: "w-4 h-4" }
                    )
                  }
                </span>
                {prediction.category_name}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {isOwner ? 'You' : prediction.user?.user_metadata.display_name}
              {prediction.locked_at ? (
                <> called it <span>{format(prediction.locked_at)} - Prediction ends {format(new Date(prediction.end_date))}</span></>
              ) : (
                <> called it <span>{format(prediction.created_at)}</span> but you need to lock it in!</>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && !prediction.is_locked && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit?.(prediction)}
                        className="hover:bg-muted"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Edit Prediction</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onLock?.(prediction)}
                        className="hover:bg-muted"
                      >
                        <Lock className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Lock Prediction</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
            {!prediction.result_text && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onAddResult}
                      className="hover:bg-muted"
                    >
                      <Medal className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Add Result</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
           
          </div>
        </div>

        {/* Prediction Content */}
        <div className="space-y-2">
          <Link 
            to={`/prediction/${encodeURIComponent(prediction.content.toLowerCase().replace(/\s+/g, '-'))}`} 
            className="hover:underline"
          >
            <h3 className="text-lg font-semibold">{prediction.content}</h3>
          </Link>
          {prediction.result_text && (
            <div className={`text-sm p-2 rounded-md ${
              prediction.is_correct 
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}>
              <p>Result: {prediction.result_text}</p>
            </div>
          )}
        </div>

        {/* Vote Counts */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isOwner ? (
            // Plain text for owner's view
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-5" />
                <span>{voteCounts.agrees}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="h-4 w-5" />
                <span>{voteCounts.disagrees}</span>
              </div>
            </div>
          ) : (
            // Interactive buttons for other users
            <>
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center hover:bg-muted ${
                  votes?.[prediction.id]?.type === 'agree' ? 'text-primary' : ''
                }`}
                onClick={() => onVote(prediction.id, 'agree')}
              >
                <ThumbsUp className={`h-4 w-4 ${
                  votes?.[prediction.id]?.type === 'agree' ? 'text-primary' : ''
                }`} />
                <span>{voteCounts.agrees}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1 hover:bg-muted ${
                  votes?.[prediction.id]?.type === 'disagree' ? 'text-primary' : ''
                }`}
                onClick={() => onVote(prediction.id, 'disagree')}
              >
                <ThumbsDown className={`h-4 w-4 ${
                  votes?.[prediction.id]?.type === 'disagree' ? 'text-primary' : ''
                }`} />
                <span>{voteCounts.disagrees}</span>
              </Button>
            
            </>
          )}
            <Link to={`/prediction/${encodeURIComponent(prediction.content.toLowerCase().replace(/\s+/g, '-'))}`}>
              <Button variant="ghost" size="icon" className="hover:bg-muted gap-1">
                <MessageSquare className="h-4 w-4" />
                {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
              </Button>
            </Link>
        </div>
      </div>
    </Card>
  )
}
