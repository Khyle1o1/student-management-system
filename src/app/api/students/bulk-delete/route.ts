import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE() {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all student IDs (including soft-deleted ones)
    const students = await prisma.student.findMany({
      select: {
        id: true,
        userId: true
      }
    })

    if (students.length === 0) {
      return NextResponse.json({ message: "No students found to delete" })
    }

    // Delete all associated records in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete attendance records (including soft-deleted ones)
      await tx.attendance.deleteMany({
        where: {
          studentId: {
            in: students.map(s => s.id)
          },
          OR: [
            { deletedAt: null },
            { deletedAt: { not: null } }
          ]
        }
      })

      // Delete payment records (including soft-deleted ones)
      await tx.payment.deleteMany({
        where: {
          studentId: {
            in: students.map(s => s.id)
          },
          OR: [
            { deletedAt: null },
            { deletedAt: { not: null } }
          ]
        }
      })

      // Delete student records (force delete)
      await tx.student.deleteMany({
        where: {
          id: {
            in: students.map(s => s.id)
          }
        }
      })

      // Finally delete user records (force delete)
      await tx.user.deleteMany({
        where: {
          id: {
            in: students.map(s => s.userId)
          }
        }
      })
    })

    return NextResponse.json({ 
      message: `Successfully deleted ${students.length} students and all their associated records permanently` 
    })
  } catch (error) {
    console.error("Error deleting students:", error)
    return NextResponse.json(
      { error: "An error occurred while deleting students" },
      { status: 500 }
    )
  }
} 