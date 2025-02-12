import { useState } from 'react'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { ThumbsUp, ThumbsDown, Medal, Share, MessageSquare } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"
import React from 'react'
import { AVAILABLE_ICONS } from './CategoryManagement'  // Import the icons map

interface PredictionCardProps {
  prediction: {
    id: string
    content: string
    user_id: string
    is_locked: boolean
    result_text?: string | null
    is_correct?: boolean
    category?: string
    category_name: string
    display_name?: string
    category_icon?: string
    categories?: {
      id: string
      name: string
      icon?: string
    }
  }
  voteCounts: {
    agrees: number
    disagrees: number
  }
  onAddResult: () => void
  isOwner: boolean
  onVote: (predictionId: string, voteType: 'agree' | 'disagree') => void
  votes?: Record<string, { type: 'agree' | 'disagree', id: string }>
}

export function PredictionCard({ prediction, voteCounts, onAddResult, isOwner, onVote, votes }: PredictionCardProps) {
  console.log('Prediction data:', {
    category: prediction.category,
    category_name: prediction.category_name
  });

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-2">
        {/* Category and Actions Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {prediction.category && (
                <>
                  {prediction.categories?.icon && (
                    <span className="w-4 h-4">
                      {AVAILABLE_ICONS[prediction.categories.icon as keyof typeof AVAILABLE_ICONS] && 
                        React.createElement(
                          AVAILABLE_ICONS[prediction.categories.icon as keyof typeof AVAILABLE_ICONS], 
                          { className: "w-4 h-4" }
                        )
                      }
                    </span>
                  )}
                  {prediction.category}
                </>
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              As predicted by {isOwner ? 'Me' : prediction.display_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
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
            {/* Future features */}
            {/*
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Share className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <MessageSquare className="h-4 w-4" />
            </Button>
            */}
          </div>
        </div>

        {/* Prediction Content */}
        <h3 className="text-lg font-medium">{prediction.content}</h3>

        {/* Vote Counts */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {isOwner ? (
            // Plain text for owner's view
            <>
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4" />
                <span>{voteCounts.agrees}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsDown className="h-4 w-4" />
                <span>{voteCounts.disagrees}</span>
              </div>
            </>
          ) : (
            // Interactive buttons for other users
            <>
              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center gap-1 hover:bg-muted ${
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
        </div>
      </div>
    </Card>
  )
}
