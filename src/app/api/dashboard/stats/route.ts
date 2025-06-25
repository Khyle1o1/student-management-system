import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current date for filtering
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Fetch all statistics in parallel
    const [
      totalStudents,
      lastMonthStudents,
      totalEvents,
      upcomingEvents,
      lastMonthEvents,
      totalFees,
      pendingPayments,
      totalRevenue,
      lastMonthRevenue,
      recentActivities
    ] = await Promise.all([
      // Total students
      prisma.student.count({
        where: { deletedAt: null }
      }),
      
      // Students from last month for growth calculation
      prisma.student.count({
        where: {
          deletedAt: null,
          createdAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth
          }
        }
      }),
      
      // Total active events
      prisma.event.count({
        where: {
          deletedAt: null,
          isActive: true
        }
      }),
      
      // Upcoming events (for this month)
      prisma.event.count({
        where: {
          deletedAt: null,
          isActive: true,
          date: {
            gte: now
          }
        }
      }),
      
      // Events created this month for growth
      prisma.event.count({
        where: {
          deletedAt: null,
          isActive: true,
          createdAt: {
            gte: startOfMonth
          }
        }
      }),
      
      // Total active fees
      prisma.feeStructure.count({
        where: {
          deletedAt: null,
          isActive: true
        }
      }),
      
      // Pending payments count (UNPAID status)
      prisma.payment.count({
        where: {
          status: "UNPAID"
        }
      }),
      
      // Total revenue (sum of paid payments)
      prisma.payment.aggregate({
        where: {
          status: "PAID"
        },
        _sum: {
          amount: true
        }
      }),
      
      // Last month revenue for growth
      prisma.payment.aggregate({
        where: {
          status: "PAID",
          createdAt: {
            gte: startOfLastMonth,
            lte: endOfLastMonth
          }
        },
        _sum: {
          amount: true
        }
      }),
      
      // Recent activities (last 10 records across different tables)
      Promise.all([
        prisma.student.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            createdAt: true
          }
        }),
        prisma.payment.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          where: {
            status: { in: ["PAID", "UNPAID"] }
          },
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            student: {
              select: { name: true }
            }
          }
        }),
        prisma.event.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          where: {
            deletedAt: null,
            isActive: true,
            date: {
              gte: now
            }
          },
          select: {
            id: true,
            title: true,
            date: true,
            createdAt: true
          }
        })
      ])
    ])

    // Calculate growth percentages
    const studentGrowth = lastMonthStudents > 0 
      ? Math.round(((totalStudents - lastMonthStudents) / lastMonthStudents) * 100)
      : 0

    const currentRevenue = totalRevenue._sum?.amount || 0
    const lastRevenue = lastMonthRevenue._sum?.amount || 0
    const revenueGrowth = lastRevenue > 0 
      ? Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100)
      : 0

    // Process recent activities
    const [recentStudents, recentPayments, recentEvents] = recentActivities
    
    const activities = [
      ...recentStudents.map(student => ({
        id: `student-${student.id}`,
        type: "student",
        title: "New student enrolled",
        description: `${student.name} joined the system`,
        time: getTimeAgo(student.createdAt),
        status: "success"
      })),
      ...recentPayments.map(payment => ({
        id: `payment-${payment.id}`,
        type: "payment",
        title: payment.status === "PAID" ? "Payment received" : "Payment pending",
        description: `₱${payment.amount.toLocaleString()} from ${payment.student?.name || 'Unknown'}`,
        time: getTimeAgo(payment.createdAt),
        status: payment.status === "PAID" ? "success" : payment.status === "UNPAID" ? "warning" : "error"
      })),
      ...recentEvents.map(event => ({
        id: `event-${event.id}`,
        type: "event",
        title: "Event scheduled",
        description: `${event.title} - ${new Date(event.date).toLocaleDateString()}`,
        time: getTimeAgo(event.createdAt),
        status: "info"
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10)

    const stats = {
      totalStudents,
      studentGrowth,
      totalEvents,
      eventGrowth: lastMonthEvents,
      upcomingEvents,
      totalRevenue: currentRevenue,
      revenueGrowth,
      pendingPayments,
      totalFees,
      activities
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMinutes < 1) {
    return "Just now"
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
  } else {
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
  }
} 