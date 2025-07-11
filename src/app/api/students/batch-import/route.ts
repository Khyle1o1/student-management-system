import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { hashPassword } from "@/lib/auth"
import { studentImportSchema } from "@/lib/validations"
import { z } from "zod"

interface StudentImportData {
  name: string
  studentId: string
  email: string
  yearLevel: string
  course: string
  college: string
  password?: string
}

interface ImportResult {
  successCount: number
  errorCount: number
  duplicates: string[]
  errors: Array<{
    studentId: string
    error: string
  }>
}

const batchStudentSchema = z.object({
  students: z.array(studentImportSchema)
})

const yearLevelMap = {
  'YEAR_1': 1,
  'YEAR_2': 2,
  'YEAR_3': 3,
  'YEAR_4': 4
}

// Helper function to retry database operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      retryCount++;
      
      // Check if it's a connection error
      const isConnectionError = 
        error instanceof Error &&
        'code' in error &&
        (error.code === 'P1017' || error.code === 'P1001' || error.code === 'P1002');
      
      if (!isConnectionError || retryCount >= maxRetries) {
        break;
      }
      
      console.log(`Retrying operation after error: ${error}, attempt ${retryCount} of ${maxRetries}`);
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay * retryCount));
    }
  }
  
  // Enhance error with more details if it's a database connection issue
  if (lastError && 'code' in lastError) {
    switch(lastError.code) {
      case 'P1001':
        throw new Error(`Database connection failed: Can't reach database server. Please check if the database is running. Error code: ${lastError.code}`);
      case 'P1002':
        throw new Error(`Database connection failed: The database server was reached but timed out. Error code: ${lastError.code}`);
      case 'P1017':
        throw new Error(`Database connection failed: Server has closed the connection. Error code: ${lastError.code}`);
      default:
        throw lastError;
    }
  }
  
  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the request body
    const validation = batchStudentSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: "Invalid data format", 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const { students } = validation.data

    // Check student limit - reduced to prevent URL length issues
    const MAX_STUDENTS = 50;
    if (students.length > MAX_STUDENTS) {
      return NextResponse.json({ 
        error: `Batch size too large. Maximum allowed is ${MAX_STUDENTS} students per batch to prevent URL length issues. Please split your data into smaller batches.`,
        status: "batch_too_large"
      }, { status: 400 })
    }

    const result: ImportResult = {
      successCount: 0,
      errorCount: 0,
      duplicates: [],
      errors: []
    }

    // Check database connection first
    try {
      await retryOperation(async () => {
        await supabase.from('students').select('id').limit(1)
      })
    } catch (error) {
      console.error("Database connection check failed:", error);
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : "Database connection failed", 
        code: error instanceof Error && 'code' in error ? error.code : 'UNKNOWN',
        status: "database_error"
      }, { status: 503 })
    }

    // Check for duplicates with retry logic
    const existingData = await retryOperation(async () => {
      // Check existing students (excluding soft-deleted)
      const { data: existingStudents, error: studentsError } = await supabase
        .from('students')
        .select('student_id')
        .in('student_id', students.map(s => s.studentId))

      if (studentsError) {
        throw new Error(`Error checking existing students: ${studentsError.message}`)
      }

      // Check existing users by email (excluding soft-deleted)
      const { data: existingUsers, error: usersError } = await supabase
        .from('users')
        .select('email')
        .in('email', students.map(s => s.email))

      if (usersError) {
        throw new Error(`Error checking existing users: ${usersError.message}`)
      }

      return {
        existingStudentIds: new Set(existingStudents?.map(s => s.student_id) || []),
        existingEmails: new Set(existingStudents?.map(s => s.student_id) || []),
        existingUserEmails: new Set(existingUsers?.map(u => u.email) || [])
      };
    });

    const { existingStudentIds, existingEmails, existingUserEmails } = existingData;

    // Check for duplicates within the batch
    const batchStudentIds = new Set<string>()
    const batchEmails = new Set<string>()
    const duplicatesInBatch = new Set<string>()

    students.forEach(student => {
      if (batchStudentIds.has(student.studentId)) {
        duplicatesInBatch.add(student.studentId)
      } else {
        batchStudentIds.add(student.studentId)
      }

      if (batchEmails.has(student.email)) {
        duplicatesInBatch.add(student.email)
      } else {
        batchEmails.add(student.email)
      }
    })

    // Process each student in smaller batches to prevent timeouts
    const BATCH_SIZE = 5;
    let processedCount = 0;
    const totalCount = students.length;
    
    console.log(`⏳ Starting batch import of ${totalCount} students...`);
    
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
      const batch = students.slice(i, i + BATCH_SIZE);
      
      // Process one student at a time to avoid connection issues
      for (const studentData of batch) {
        try {
          // Validate student ID is numeric
          if (!/^\d+$/.test(studentData.studentId)) {
            result.errorCount++;
            result.errors.push({
              studentId: studentData.studentId,
              error: "Student ID must contain only numbers"
            });
            processedCount++;
            console.log(`🔄 Processed: ${processedCount}/${totalCount} (${Math.round(processedCount/totalCount*100)}%) - Invalid student ID: ${studentData.studentId}`);
            continue;
          }
          
          // Check for duplicates
          if (existingStudentIds.has(studentData.studentId)) {
            result.duplicates.push(studentData.studentId);
            processedCount++;
            console.log(`🔄 Processed: ${processedCount}/${totalCount} (${Math.round(processedCount/totalCount*100)}%) - Duplicate ID: ${studentData.studentId}`);
            continue;
          }

          if (existingEmails.has(studentData.email) || existingUserEmails.has(studentData.email)) {
            result.duplicates.push(studentData.email);
            processedCount++;
            console.log(`🔄 Processed: ${processedCount}/${totalCount} (${Math.round(processedCount/totalCount*100)}%) - Duplicate email: ${studentData.email}`);
            continue;
          }

          if (duplicatesInBatch.has(studentData.studentId) || duplicatesInBatch.has(studentData.email)) {
            result.duplicates.push(studentData.studentId);
            processedCount++;
            console.log(`🔄 Processed: ${processedCount}/${totalCount} (${Math.round(processedCount/totalCount*100)}%) - Duplicate in batch: ${studentData.studentId}`);
            continue;
          }

          // Create user first
          const hashedPassword = await hashPassword(studentData.password || Math.random().toString(36).slice(-8))
          const { data: user, error: userError } = await supabase
            .from('users')
            .insert([{
              email: studentData.email,
              password: hashedPassword,
              name: studentData.name,
              role: 'STUDENT'
            }])
            .select()
            .single()

          if (userError) {
            throw new Error(`Error creating user: ${userError.message}`)
          }

          // Create student record
          const { error: studentError } = await supabase
            .from('students')
            .insert([{
              user_id: user.id,
              student_id: studentData.studentId,
              name: studentData.name,
              email: studentData.email,
              college: studentData.college,
              year_level: yearLevelMap[studentData.yearLevel as keyof typeof yearLevelMap],
              course: studentData.course
            }])

          if (studentError) {
            // Rollback user creation if student creation fails
            await supabase
              .from('users')
              .delete()
              .eq('id', user.id)
            throw new Error(`Error creating student: ${studentError.message}`)
          }

          result.successCount++
          processedCount++
          console.log(`✅ Processed: ${processedCount}/${totalCount} (${Math.round(processedCount/totalCount*100)}%) - Success: ${studentData.studentId}`)
          
          // Add to sets to prevent duplicates in subsequent iterations
          existingStudentIds.add(studentData.studentId);
          existingEmails.add(studentData.email.toLowerCase());
          existingUserEmails.add(studentData.email.toLowerCase());
        } catch (error) {
          console.error(`Error creating student ${studentData.studentId}:`, error);
          result.errorCount++;
          result.errors.push({
            studentId: studentData.studentId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          processedCount++;
          console.log(`❌ Processed: ${processedCount}/${totalCount} (${Math.round(processedCount/totalCount*100)}%) - Error creating: ${studentData.studentId}`);
        }
      }
    }
    
    console.log(`🎉 Import complete! Successfully processed ${result.successCount} students with ${result.errorCount} errors and ${result.duplicates.length} duplicates.`);

    return NextResponse.json({
      ...result,
      duplicateCount: result.duplicates.length
    }, { status: 200 });
  } catch (error) {
    console.error("Error in batch import:", error);
    const errorMessage = error instanceof Error 
      ? error.message 
      : "An unexpected error occurred";
      
    return NextResponse.json({ 
      error: "Internal server error", 
      details: errorMessage 
    }, { status: 500 });
  }
} 