/**
 * Student Data Upload Script for Supabase
 * 
 * This script uploads real student data directly to Supabase database.
 * It can read from CSV files and insert them into the database.
 * 
 * Usage:
 *   node scripts/upload-students.js <csv-file-path>
 * 
 * Example:
 *   node scripts/upload-students.js data/students.csv
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase credentials not found in .env.local')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Year level mapping
const yearLevelMap = {
  'YEAR_1': 1,
  'YEAR_2': 2,
  'YEAR_3': 3,
  'YEAR_4': 4,
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4
}

/**
 * Hash password using bcrypt
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10)
}

/**
 * Parse CSV file
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.trim().split('\n')
  
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row')
  }

  // Parse header
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  
  // Parse data rows
  const students = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    const student = {}
    
    headers.forEach((header, index) => {
      student[header] = values[index] || ''
    })
    
    students.push(student)
  }
  
  return students
}

/**
 * Validate student data
 */
function validateStudent(student, index) {
  const errors = []
  
  if (!student.name || student.name.trim() === '') {
    errors.push(`Row ${index + 2}: Name is required`)
  }
  
  if (!student.email || !student.email.includes('@')) {
    errors.push(`Row ${index + 2}: Valid email is required`)
  }
  
  if (!student.studentId || student.studentId.trim() === '') {
    errors.push(`Row ${index + 2}: Student ID is required`)
  }
  
  if (!student.college || student.college.trim() === '') {
    errors.push(`Row ${index + 2}: College is required`)
  }
  
  if (!student.course || student.course.trim() === '') {
    errors.push(`Row ${index + 2}: Course is required`)
  }
  
  const yearLevel = student.yearLevel || student.year_level || student.year
  if (!yearLevel || !yearLevelMap[yearLevel.toString()]) {
    errors.push(`Row ${index + 2}: Valid year level is required (YEAR_1, YEAR_2, YEAR_3, YEAR_4, or 1-4)`)
  }
  
  return errors
}

/**
 * Upload students to Supabase
 */
async function uploadStudents(students) {
  console.log(`\n📊 Processing ${students.length} students...\n`)
  
  const results = {
    successful: 0,
    failed: 0,
    skipped: 0,
    errors: []
  }
  
  for (let i = 0; i < students.length; i++) {
    const student = students[i]
    const rowNum = i + 2
    
    try {
      // Validate student data
      const validationErrors = validateStudent(student, i)
      if (validationErrors.length > 0) {
        results.errors.push(...validationErrors)
        results.failed++
        continue
      }
      
      // Extract year level
      const yearLevelInput = student.yearLevel || student.year_level || student.year
      const yearLevel = yearLevelMap[yearLevelInput.toString()]
      
      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', student.email.toLowerCase().trim())
        .single()
      
      if (existingUser) {
        console.log(`⚠️  Row ${rowNum}: User with email ${student.email} already exists - skipping`)
        results.skipped++
        continue
      }
      
      // Check if student ID already exists
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', student.studentId.trim())
        .single()
      
      if (existingStudent) {
        console.log(`⚠️  Row ${rowNum}: Student ID ${student.studentId} already exists - skipping`)
        results.skipped++
        continue
      }
      
      // Create user first
      const password = student.password || `student${student.studentId}`
      const hashedPassword = await hashPassword(password)
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert([{
          email: student.email.toLowerCase().trim(),
          password: hashedPassword,
          name: student.name.trim(),
          role: 'STUDENT'
        }])
        .select()
        .single()
      
      if (userError) {
        throw new Error(`Failed to create user: ${userError.message}`)
      }
      
      // Create student record
      const { error: studentError } = await supabase
        .from('students')
        .insert([{
          user_id: user.id,
          student_id: student.studentId.trim(),
          name: student.name.trim(),
          email: student.email.toLowerCase().trim(),
          phone: student.phone?.trim() || null,
          college: student.college.trim(),
          year_level: yearLevel,
          course: student.course.trim()
        }])
      
      if (studentError) {
        // Rollback: delete the user we just created
        await supabase.from('users').delete().eq('id', user.id)
        throw new Error(`Failed to create student record: ${studentError.message}`)
      }
      
      console.log(`✅ Row ${rowNum}: Successfully created student ${student.name} (${student.studentId})`)
      results.successful++
      
    } catch (error) {
      console.error(`❌ Row ${rowNum}: Error processing ${student.name || 'unknown'}: ${error.message}`)
      results.errors.push(`Row ${rowNum}: ${error.message}`)
      results.failed++
    }
  }
  
  return results
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Student Data Upload Script\n')
  console.log('================================\n')
  
  // Get CSV file path from arguments
  const csvFilePath = process.argv[2]
  
  if (!csvFilePath) {
    console.error('❌ Error: Please provide a CSV file path')
    console.error('\nUsage: node scripts/upload-students.js <csv-file-path>')
    console.error('Example: node scripts/upload-students.js data/students.csv')
    process.exit(1)
  }
  
  // Check if file exists
  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ Error: File not found: ${csvFilePath}`)
    process.exit(1)
  }
  
  try {
    // Parse CSV
    console.log(`📁 Reading CSV file: ${csvFilePath}`)
    const students = parseCSV(csvFilePath)
    console.log(`✅ Parsed ${students.length} students from CSV\n`)
    
    // Upload students
    const results = await uploadStudents(students)
    
    // Print summary
    console.log('\n================================')
    console.log('📈 Upload Summary')
    console.log('================================')
    console.log(`✅ Successful: ${results.successful}`)
    console.log(`⚠️  Skipped: ${results.skipped}`)
    console.log(`❌ Failed: ${results.failed}`)
    console.log(`📊 Total: ${students.length}\n`)
    
    if (results.errors.length > 0) {
      console.log('⚠️  Errors encountered:')
      results.errors.forEach(error => console.log(`   - ${error}`))
      console.log('')
    }
    
    if (results.successful > 0) {
      console.log('✨ Upload completed successfully!')
    } else {
      console.log('⚠️  No students were uploaded. Please check the errors above.')
    }
    
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`)
    process.exit(1)
  }
}

// Run the script
main()

