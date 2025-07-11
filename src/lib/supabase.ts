import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase environment variables:',
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : '',
    !supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''
  )
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: false // Since we're using NextAuth for auth
    }
  }
)

// Helper types based on your database schema
export type Database = {
  public: {
    tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          name?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          role?: string
          created_at?: string
        }
      }
      students: {
        Row: {
          id: string
          user_id: string
          student_id: string
          name: string
          email: string
          phone: string | null
          college: string
          year_level: number
          course: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          student_id: string
          name: string
          email: string
          phone?: string | null
          college: string
          year_level: number
          course: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          student_id?: string
          name?: string
          email?: string
          phone?: string | null
          college?: string
          year_level?: number
          course?: string
          created_at?: string
          updated_at?: string
        }
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          date: string
          location: string | null
          scope_type: string
          scope_college: string | null
          scope_course: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          date: string
          location?: string | null
          scope_type?: string
          scope_college?: string | null
          scope_course?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          date?: string
          location?: string | null
          scope_type?: string
          scope_college?: string | null
          scope_course?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      attendance: {
        Row: {
          id: string
          event_id: string
          student_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          student_id: string
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          student_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      fee_structures: {
        Row: {
          id: string
          name: string
          amount: number
          due_date: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          amount: number
          due_date: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          amount?: number
          due_date?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      payments: {
        Row: {
          id: string
          student_id: string
          fee_id: string
          amount: number
          payment_date: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          fee_id: string
          amount: number
          payment_date: string
          status: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          fee_id?: string
          amount?: number
          payment_date?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
} 