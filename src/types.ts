export interface Prediction {
  id: string
  content: string
  user_id: string
  is_locked: boolean
  created_at: string
  updated_at: string
  locked_at?: string
  result_text?: string
  is_correct?: boolean
  result_added_at?: string
  category_id?: string
  user: {
    user_metadata: {
      display_name: string
    }
  }
  category?: string
}