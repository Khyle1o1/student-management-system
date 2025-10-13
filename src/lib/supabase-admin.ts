import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing Supabase environment variables for admin client:',
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : '',
    !serviceRoleKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''
  )
}

export const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || '', {
  auth: { persistSession: false }
})


