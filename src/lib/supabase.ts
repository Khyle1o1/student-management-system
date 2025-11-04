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
          user_id: string | null
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
          user_id?: string | null
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
          user_id?: string | null
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
          require_evaluation: boolean | null
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
          require_evaluation?: boolean | null
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
          require_evaluation?: boolean | null
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
          time_in: string | null
          time_out: string | null
          mode: string | null
          certificate_generated: boolean | null
          evaluation_completed: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          student_id: string
          status: string
          time_in?: string | null
          time_out?: string | null
          mode?: string | null
          certificate_generated?: boolean | null
          evaluation_completed?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          student_id?: string
          status?: string
          time_in?: string | null
          time_out?: string | null
          mode?: string | null
          certificate_generated?: boolean | null
          evaluation_completed?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      evaluations: {
        Row: {
          id: string
          title: string
          description: string | null
          questions: any // JSONB
          is_template: boolean | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          questions: any // JSONB
          is_template?: boolean | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          questions?: any // JSONB
          is_template?: boolean | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      event_evaluations: {
        Row: {
          id: string
          event_id: string
          evaluation_id: string
          is_required: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          evaluation_id: string
          is_required?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          evaluation_id?: string
          is_required?: boolean | null
          created_at?: string
        }
      }
      student_evaluation_responses: {
        Row: {
          id: string
          event_id: string
          student_id: string
          evaluation_id: string
          responses: any // JSONB
          submitted_at: string
        }
        Insert: {
          id?: string
          event_id: string
          student_id: string
          evaluation_id: string
          responses: any // JSONB
          submitted_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          student_id?: string
          evaluation_id?: string
          responses?: any // JSONB
          submitted_at?: string
        }
      }
      certificates: {
        Row: {
          id: string
          event_id: string
          student_id: string
          certificate_type: string | null
          generated_at: string
          is_accessible: boolean | null
          file_path: string | null
          certificate_number: string | null
        }
        Insert: {
          id?: string
          event_id: string
          student_id: string
          certificate_type?: string | null
          generated_at?: string
          is_accessible?: boolean | null
          file_path?: string | null
          certificate_number?: string | null
        }
        Update: {
          id?: string
          event_id?: string
          student_id?: string
          certificate_type?: string | null
          generated_at?: string
          is_accessible?: boolean | null
          file_path?: string | null
          certificate_number?: string | null
        }
      }
      certificate_access_log: {
        Row: {
          id: string
          certificate_id: string
          student_id: string | null
          access_type: string
          accessed_at: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          certificate_id: string
          student_id?: string | null
          access_type: string
          accessed_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          certificate_id?: string
          student_id?: string | null
          access_type?: string
          accessed_at?: string
          ip_address?: string | null
          user_agent?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string | null
          student_id: string | null
          type: string
          title: string
          message: string
          data: any | null // JSONB
          is_read: boolean | null
          created_at: string
          read_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          student_id?: string | null
          type: string
          title: string
          message: string
          data?: any | null // JSONB
          is_read?: boolean | null
          created_at?: string
          read_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          student_id?: string | null
          type?: string
          title?: string
          message?: string
          data?: any | null // JSONB
          is_read?: boolean | null
          created_at?: string
          read_at?: string | null
          expires_at?: string | null
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

// Additional type definitions for the certificate and evaluation system
export interface EvaluationQuestion {
  id: string
  type: 'multiple_choice' | 'rating' | 'text' | 'boolean'
  question: string
  options?: string[] // For multiple choice
  required: boolean
  min_rating?: number // For rating type
  max_rating?: number // For rating type
}

export interface EvaluationResponse {
  [questionId: string]: string | number | boolean
}

export interface CertificateData {
  studentName: string
  eventTitle: string
  eventDate: string
  certificateNumber: string
  issuedDate: string
}

// Notification types
export type NotificationType = 'ATTENDANCE_CONFIRMED' | 'EVALUATION_REQUIRED' | 'CERTIFICATE_READY' | 'SYSTEM_ACTIVITY'

export interface NotificationData {
  event_id?: string
  certificate_id?: string
  evaluation_id?: string
  evaluation_url?: string
  certificate_url?: string
  event_title?: string
  event_date?: string
  [key: string]: any
} 