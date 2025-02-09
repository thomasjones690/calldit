export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      predictions: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          content: string
          user_id: string
          is_locked: boolean
          locked_at: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          content: string
          user_id: string
          is_locked?: boolean
          locked_at?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          content?: string
          user_id?: string
          is_locked?: boolean
          locked_at?: string | null
        }
      }
    }
  }
}
