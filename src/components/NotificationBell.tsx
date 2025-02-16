'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from './ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover'
import { useAuth } from '@/lib/supabase/auth-context'
import { supabase } from '@/lib/supabase/client'
import { Link } from 'react-router-dom'

interface Notification {
  prediction_content: string
  prediction_id: string
  comment_content: string
  comment_id: string
  commenter_name: string
  created_at: string
  seen: boolean
}

export function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (user) {
      fetchNotifications()
      // Set up real-time subscription for new comments
      const subscription = supabase
        .channel('comment-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
        }, () => {
          fetchNotifications()
        })
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('comments')
      .select(`
        id as comment_id,
        content as comment_content,
        created_at,
        predictions!inner (
          id as prediction_id,
          content as prediction_content,
          user_id
        ),
        profiles (
          display_name
        ),
        comment_notifications (
          seen_at
        )
      `)
      .eq('predictions.user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching notifications:', error)
      return
    }

    const formattedNotifications = data.map((n: any) => ({
      prediction_content: n.predictions.content,
      prediction_id: n.predictions.prediction_id,
      comment_content: n.comment_content,
      comment_id: n.comment_id,
      commenter_name: n.profiles.display_name,
      created_at: n.created_at,
      seen: n.comment_notifications?.[0]?.seen_at != null
    }))

    setNotifications(formattedNotifications)
    setUnreadCount(formattedNotifications.filter(n => !n.seen).length)
  }

  const markAsSeen = async (commentId: string, predictionId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('comment_notifications')
      .insert({
        user_id: user.id,
        comment_id: commentId,
        prediction_id: predictionId,
        seen_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error marking notification as seen:', error)
      return
    }

    fetchNotifications()
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="space-y-2 p-4">
          <h4 className="font-medium leading-none mb-4">Notifications</h4>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No new notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <Link
                  key={notification.comment_id}
                  to={`/prediction/${encodeURIComponent(notification.prediction_content.toLowerCase().replace(/\s+/g, '-'))}`}
                  className="block"
                  onClick={() => {
                    markAsSeen(notification.comment_id, notification.prediction_id)
                    setOpen(false)
                  }}
                >
                  <div className={`p-2 rounded-md hover:bg-muted ${!notification.seen ? 'bg-muted/50' : ''}`}>
                    <p className="text-sm font-medium">
                      {notification.commenter_name} commented on your prediction
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {notification.prediction_content}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}