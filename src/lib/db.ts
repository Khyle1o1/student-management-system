import { Pool, QueryResult, QueryResultRow } from "pg"

// Create a new pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? {
    rejectUnauthorized: false
  } : undefined
})

// Export the query method with type support
export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> => pool.query(text, params)
}

// Export types for database records
export interface Student {
  id: string
  first_name: string
  last_name: string
  barcode: string
}

export interface Event {
  id: string
  title: string
  description: string
  event_date: Date
  start_time: string
  end_time: string
  location: string
  allow_multiple_entries: boolean
}

export interface AttendanceRecord {
  id: string
  event_id: string
  student_id: string
  time_in: Date
  time_out: Date | null
} 