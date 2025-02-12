export interface Prediction {
  id: string
  content: string
  user_id: string
  is_locked: boolean
  locked_at: string | null
  created_at: string
  updated_at: string
  result_text?: string | null
  is_correct?: boolean
  result_added_at?: string
  category_id?: string
  category_name: string
  user: {
    user_metadata: {
      display_name: string
    }
  }
  category?: string
}