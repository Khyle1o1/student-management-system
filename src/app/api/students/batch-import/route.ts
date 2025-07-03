import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
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
    const result: ImportResult = {
      successCount: 0,
      errorCount: 0,
      duplicates: [],
      errors: []
    }

    // Check database connection first
    try {
      await retryOperation(async () => {
        await prisma.$queryRaw`SELECT 1`
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
      const existingStudents = await prisma.student.findMany({
        where: {
          AND: [
            {
              OR: [
                { studentId: { in: students.map(s => s.studentId) } },
                { email: { in: students.map(s => s.email) } }
              ]
            },
            { deletedAt: null }
          ]
        },
        select: {
          studentId: true,
          email: true
        }
      })
    
      // Check existing users by email (excluding soft-deleted)
      const existingUsers = await prisma.user.findMany({
        where: {
          email: { in: students.map(s => s.email) },
          deletedAt: null
        },
        select: {
          email: true
        }
      })
    
      return {
        existingStudentIds: new Set(existingStudents.map((s: { studentId: string }) => s.studentId)),
        existingEmails: new Set(existingStudents.map((s: { email: string }) => s.email)),
        existingUserEmails: new Set(existingUsers.map((u: { email: string }) => u.email))
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

          // Create user and student with retry logic
          await retryOperation(async () => {
            // Create in transaction to ensure data consistency
            return await prisma.$transaction(async (tx) => {
              // Hash password
              const password = studentData.password || 'student123';
              const hashedPassword = await bcrypt.hash(password, 12);
              
              // Create user first
              const user = await tx.user.create({
                data: {
                  email: studentData.email.toLowerCase(),
                  password: hashedPassword,
                  role: "STUDENT",
                  name: studentData.name,
                }
              });
              
              // Create student record
              await tx.student.create({
                data: {
                  studentId: studentData.studentId,
                  userId: user.id,
                  name: studentData.name,
                  email: studentData.email.toLowerCase(),
                  yearLevel: studentData.yearLevel as any,
                  course: studentData.course,
                  college: studentData.college,
                } as any
              });
            });
          });

          result.successCount++;
          processedCount++;
          console.log(`✅ Processed: ${processedCount}/${totalCount} (${Math.round(processedCount/totalCount*100)}%) - Successfully created: ${studentData.name} (${studentData.studentId})`);
          
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