import { Pool, QueryResult, QueryResultRow } from "pg"

// Create a new pool instance with optimized configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // Connection pool configuration
  max: 20, // Maximum connections in pool
  min: 5, // Minimum idle connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout when acquiring connection (5 seconds)
  
  // Keep-alive to prevent connection drops
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  
  // SSL configuration
  ssl: process.env.NODE_ENV === "production" ? {
    rejectUnauthorized: false
  } : undefined,
  
  // Statement timeout (prevent long-running queries)
  statement_timeout: 30000, // 30 seconds
})

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing database pool...')
  await pool.end()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, closing database pool...')
  await pool.end()
  process.exit(0)
})

// Export the query method with type support
export const db = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> => pool.query(text, params),
  
  // Add connection health check
  async healthCheck(): Promise<boolean> {
    try {
      await pool.query('SELECT 1')
      return true
    } catch (error) {
      console.error('Database health check failed:', error)
      return false
    }
  },
  
  // Get pool stats for monitoring
  getPoolStats() {
    return {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    }
  }
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
  attendance_type: 'IN_ONLY' | 'IN_OUT'
}

export interface AttendanceRecord {
  id: string
  event_id: string
  student_id: string
  time_in: Date
  time_out: Date | null
} 