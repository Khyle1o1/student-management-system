/**
 * Test Upload Script
 * 
 * Quick test to verify Supabase connection and upload functionality
 * This creates one test student to verify everything works
 */

const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n')
  
  try {
    // Test connection by counting students
    const { data, error, count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      return false
    }
    
    console.log('✅ Connection successful!')
    console.log(`📊 Current student count: ${count}\n`)
    return true
    
  } catch (error) {
    console.error('❌ Connection error:', error.message)
    return false
  }
}

async function testUpload() {
  console.log('🧪 Testing student upload...\n')
  
  const testStudent = {
    name: 'Test Student',
    email: `test.student.${Date.now()}@student.buksu.edu.ph`,
    studentId: `TEST${Date.now()}`,
    college: 'Test College',
    yearLevel: 1,
    course: 'Test Course',
    password: 'test123'
  }
  
  try {
    // Create user
    const hashedPassword = await bcrypt.hash(testStudent.password, 10)
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert([{
        email: testStudent.email,
        password: hashedPassword,
        name: testStudent.name,
        role: 'STUDENT'
      }])
      .select()
      .single()
    
    if (userError) {
      console.error('❌ Failed to create user:', userError.message)
      return false
    }
    
    console.log('✅ User created:', user.email)
    
    // Create student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .insert([{
        user_id: user.id,
        student_id: testStudent.studentId,
        name: testStudent.name,
        email: testStudent.email,
        college: testStudent.college,
        year_level: testStudent.yearLevel,
        course: testStudent.course
      }])
      .select()
      .single()
    
    if (studentError) {
      console.error('❌ Failed to create student:', studentError.message)
      // Cleanup user
      await supabase.from('users').delete().eq('id', user.id)
      return false
    }
    
    console.log('✅ Student created:', student.student_id)
    console.log('\n🧹 Cleaning up test data...')
    
    // Cleanup
    await supabase.from('students').delete().eq('id', student.id)
    await supabase.from('users').delete().eq('id', user.id)
    
    console.log('✅ Test data cleaned up\n')
    return true
    
  } catch (error) {
    console.error('❌ Upload test failed:', error.message)
    return false
  }
}

async function main() {
  console.log('🚀 Supabase Upload Test\n')
  console.log('================================\n')
  
  const connectionOk = await testConnection()
  if (!connectionOk) {
    console.error('\n❌ Connection test failed. Please check your credentials.')
    process.exit(1)
  }
  
  const uploadOk = await testUpload()
  if (!uploadOk) {
    console.error('\n❌ Upload test failed. Please check your permissions.')
    process.exit(1)
  }
  
  console.log('================================')
  console.log('✨ All tests passed!')
  console.log('🎉 You can now upload real student data')
  console.log('================================\n')
  console.log('Next steps:')
  console.log('1. Prepare your CSV file with real student data')
  console.log('2. Run: node scripts/upload-students.js data/your-file.csv')
}

main()

