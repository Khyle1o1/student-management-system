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

    // Students can only access their own dashboard data
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

    // Get attendance statistics
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        studentId: student.id,
      }
    })

    const totalEvents = attendanceRecords.length
    const attendedEvents = attendanceRecords.filter(record => record.status === 'PRESENT').length
    const attendanceRate = totalEvents > 0 ? Math.round((attendedEvents / totalEvents) * 100) : 0

    // Get fee statistics
    const currentYear = new Date().getFullYear()
    const fees = await prisma.feeStructure.findMany({
      where: {
        schoolYear: currentYear.toString(),
        isActive: true,
        deletedAt: null,
      }
    })

    const payments = await prisma.payment.findMany({
      where: {
        studentId: student.id,
        deletedAt: null,
      },
      include: {
        fee: {
          select: {
            id: true,
            amount: true,
          }
        }
      }
    })

    // Determine the set of relevant fee structures
    const feeIdsFromPayments = payments.map(p => p.feeId)
    const additionalFees = await prisma.feeStructure.findMany({
      where: {
        id: { in: feeIdsFromPayments },
        deletedAt: null,
      },
      select: {
        id: true,
        amount: true,
      }
    })

    // Merge fees from current year and those referenced in payments
    const feeMap: Record<string, number> = {}
    fees.forEach(f => {
      feeMap[f.id] = f.amount
    })
    additionalFees.forEach(f => {
      feeMap[f.id] = f.amount
    })

    const totalFees = Object.values(feeMap).reduce((sum, amt) => sum + amt, 0)
    const paidFees = payments
      .filter(payment => payment.status === 'PAID')
      .reduce((sum, payment) => sum + payment.amount, 0)
    const pendingFees = Math.max(totalFees - paidFees, 0)
    const paymentProgress = totalFees > 0 ? Math.round((paidFees / totalFees) * 100) : 0

    // Get upcoming events (next 7 days)
    const today = new Date()
    const nextWeek = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000))

    const upcomingEvents = await prisma.event.findMany({
      where: {
        date: {
          gte: today,
          lte: nextWeek
        },
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        date: 'asc'
      },
      take: 5 // Limit to 5 upcoming events
    })

    // Format upcoming events with priority
    const formattedUpcomingEvents = upcomingEvents.map(event => {
      // Simple priority logic based on event type
      let priority = "medium"
      if (event.type === "ACADEMIC" || event.type === "SEMINAR") {
        priority = "high"
      } else if (event.type === "MEETING") {
        priority = "low"
      }

      return {
        id: event.id,
        title: event.title,
        date: event.date,
        type: event.type.toLowerCase(),
        priority
      }
    })

    const stats = {
      attendanceRate,
      totalEvents,
      attendedEvents,
      totalFees,
      paidFees,
      pendingFees,
      paymentProgress
    }

    return NextResponse.json({
      stats,
      upcomingEvents: formattedUpcomingEvents
    })
  } catch (error) {
    console.error("Error fetching student dashboard data:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 