import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { paymentSchema } from "@/lib/validations"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all students, fees, and payments in one query
    const [students, fees, payments] = await Promise.all([
      prisma.student.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          studentId: true,
          name: true,
          email: true,
          yearLevel: true,
          section: true,
          course: true,
        },
        orderBy: { name: 'asc' }
      }),
      prisma.feeStructure.findMany({
        where: { 
          deletedAt: null, 
          isActive: true 
        },
        select: {
          id: true,
          name: true,
          type: true,
          amount: true,
          schoolYear: true,
          semester: true,
        },
        orderBy: { name: 'asc' }
      }),
      prisma.payment.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          studentId: true,
          feeId: true,
          amount: true,
          status: true,
          paymentDate: true,
          paymentMethod: true,
          reference: true,
          notes: true,
          createdAt: true,
        }
      })
    ])

    // Create a payment matrix - each student with their payment status for each fee
    const paymentMatrix = students.map(student => {
      const studentPayments = payments.filter(p => p.studentId === student.id)
      
      const feePayments = fees.map(fee => {
        const payment = studentPayments.find(p => p.feeId === fee.id)
        return {
          feeId: fee.id,
          feeName: fee.name,
          feeAmount: fee.amount,
          paymentId: payment?.id || null,
          status: payment?.status || 'UNPAID',
          amount: payment?.amount || 0,
          paymentDate: payment?.paymentDate?.toISOString() || null,
          paymentMethod: payment?.paymentMethod || null,
          reference: payment?.reference || null,
          notes: payment?.notes || null,
        }
      })

      return {
        student,
        payments: feePayments,
        totalFees: fees.reduce((sum, fee) => sum + fee.amount, 0),
        totalPaid: feePayments
          .filter(p => p.status === 'PAID')
          .reduce((sum, p) => sum + p.amount, 0),
      }
    })

    return NextResponse.json({
      students: paymentMatrix,
      fees: fees.map(fee => ({
        id: fee.id,
        name: fee.name,
        type: fee.type.toLowerCase().replace('_', ' '),
        amount: fee.amount,
        schoolYear: fee.schoolYear,
        semester: fee.semester || '',
      }))
    })
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    
    // Validate the incoming data
    const { studentId, feeId, status, amount, paymentMethod, reference, notes } = body
    
    if (!studentId || !feeId || !status) {
      return NextResponse.json({ error: "Student ID, Fee ID, and status are required" }, { status: 400 })
    }

    // Check if payment record already exists
    const existingPayment = await prisma.payment.findUnique({
      where: {
        studentId_feeId: {
          studentId,
          feeId
        }
      }
    })

    let payment
    if (existingPayment) {
      // Update existing payment
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          status,
          amount: amount || existingPayment.amount,
          paymentDate: status === 'PAID' ? new Date() : null,
          paymentMethod: paymentMethod || existingPayment.paymentMethod,
          reference: reference || existingPayment.reference,
          notes: notes || existingPayment.notes,
        }
      })
    } else {
      // Get the fee amount if not provided
      const fee = await prisma.feeStructure.findUnique({
        where: { id: feeId },
        select: { amount: true }
      })

      if (!fee) {
        return NextResponse.json({ error: "Fee not found" }, { status: 404 })
      }

      // Create new payment record
      payment = await prisma.payment.create({
        data: {
          studentId,
          feeId,
          status,
          amount: amount || fee.amount,
          paymentDate: status === 'PAID' ? new Date() : null,
          paymentMethod,
          reference,
          notes,
        }
      })
    }

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error("Error creating/updating payment:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 