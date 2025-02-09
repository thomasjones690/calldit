// src/components/PredictionStats.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'

type Stats = {
  correct: number
  incorrect: number
}

export function PredictionStats() {
  const [stats, setStats] = useState<Stats>({ correct: 0, incorrect: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    
    // Set up realtime subscription for any changes to predictions
    const channel = supabase
      .channel('prediction_stats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictions'
        },
        (payload) => {
          console.log('Stats subscription received:', payload)
          
          // Fetch fresh stats whenever there's any change
          // This ensures we have accurate counts
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchStats = async () => {
    try {
      console.log('Fetching stats...')
      const { data, error } = await supabase
        .from('predictions')
        .select('is_correct')
        .not('is_correct', 'is', null)

      if (error) {
        console.error('Error fetching stats:', error)
        throw error
      }

      const correct = data.filter(p => p.is_correct).length
      const incorrect = data.filter(p => !p.is_correct).length
      
      console.log('New stats:', { correct, incorrect })
      setStats({ correct, incorrect })
    } catch (error) {
      console.error('Error in fetchStats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const total = stats.correct + stats.incorrect
  const correctPercentage = total > 0 ? (stats.correct / total) * 100 : 50

  if (isLoading) {
    return <div className="h-8 bg-gray-100" />
  }

  return (
    <div className="relative h-8">
      {/* Gradient Background */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{
          background: `linear-gradient(90deg, 
            rgba(34, 197, 94, 0.1) 0%, 
            rgba(34, 197, 94, 0.1) ${correctPercentage}%, 
            rgba(239, 68, 68, 0.1) ${correctPercentage}%, 
            rgba(239, 68, 68, 0.1) 100%)`
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
      />

      {/* Stats Display */}
      <div className="container mx-auto px-4 h-full flex justify-between items-center text-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={`correct-${stats.correct}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex items-center space-x-2 text-green-600"
          >
            <span className="font-medium">{stats.correct}</span>
            <span>Correct</span>
            <span className="text-gray-400">
              ({total > 0 ? Math.round((stats.correct / total) * 100) : 0}%)
            </span>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`incorrect-${stats.incorrect}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex items-center space-x-2 text-red-600"
          >
            <span className="font-medium">{stats.incorrect}</span>
            <span>Incorrect</span>
            <span className="text-gray-400">
              ({total > 0 ? Math.round((stats.incorrect / total) * 100) : 0}%)
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}