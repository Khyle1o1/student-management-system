import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { studentId: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Students can only access their own fee information
    if (session.user.role === "STUDENT" && session.user.studentId !== params.studentId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Find the student
    const student = await prisma.student.findUnique({
      where: { 
        studentId: params.studentId,
        deletedAt: null,
      }
    })

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 })
    }

    // Fetch all fee structures for the current school year
    // In a real app, you might want to filter by student's year level, course, etc.
    const currentYear = new Date().getFullYear()
    const fees = await prisma.feeStructure.findMany({
      where: {
        schoolYear: currentYear.toString(),
        isActive: true,
        deletedAt: null,
        // You can add more filters here based on student's course, year level, etc.
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Fetch all payments made by this student
    const payments = await prisma.payment.findMany({
      where: {
        studentId: student.id,
        deletedAt: null,
      },
      include: {
        fee: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        }
      },
      orderBy: {
        paymentDate: 'desc'
      }
    })

    // Calculate summary statistics
    const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0)
    const totalPaid = payments
      .filter(payment => payment.status === 'PAID')
      .reduce((sum, payment) => sum + payment.amount, 0)
    const totalPending = totalFees - totalPaid
    const paymentProgress = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0

    const summary = {
      totalFees,
      totalPaid,
      totalPending,
      paymentProgress
    }

    // Format the data for the frontend
    const formattedFees = fees.map(fee => ({
      id: fee.id,
      name: fee.name,
      type: fee.type,
      amount: fee.amount,
      description: fee.description,
      dueDate: fee.dueDate,
      semester: fee.semester,
      schoolYear: fee.schoolYear,
    }))

    const formattedPayments = payments.map(payment => ({
      id: payment.id,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.notes,
      paidAt: payment.paymentDate,
      status: payment.status,
      fee: {
        id: payment.fee.id,
        name: payment.fee.name,
        type: payment.fee.type,
      }
    }))

    return NextResponse.json({
      fees: formattedFees,
      payments: formattedPayments,
      summary
    })
  } catch (error) {
    console.error("Error fetching student fees:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 