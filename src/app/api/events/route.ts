import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { eventSchema } from "@/lib/validations"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const events = await prisma.event.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        date: true,
        startTime: true,
        endTime: true,
        location: true,
        maxCapacity: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Transform the data to match frontend expectations
    const transformedEvents = events.map(event => {
      // Determine status based on date
      const eventDate = new Date(event.date)
      const today = new Date()
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const eventDateStart = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
      
      let status = "completed"
      if (eventDateStart > todayStart) {
        status = "upcoming"
      } else if (eventDateStart.getTime() === todayStart.getTime()) {
        status = "ongoing"
      }

      return {
        id: event.id,
        title: event.title,
        description: event.description,
        eventDate: event.date.toISOString().split('T')[0], // YYYY-MM-DD format
        startTime: event.startTime.toTimeString().split(' ')[0].substring(0, 5), // HH:MM format
        endTime: event.endTime?.toTimeString().split(' ')[0].substring(0, 5) || "", // HH:MM format
        location: event.location,
        eventType: event.type.toLowerCase().replace('_', ' '),
        capacity: event.maxCapacity || 0,
        registeredCount: 0, // TODO: Calculate from attendance records
        status: status,
      }
    })

    return NextResponse.json(transformedEvents)
  } catch (error) {
    console.error("Error fetching events:", error)
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
    const validatedData = eventSchema.parse(body)

    // Combine date and time for startTime and endTime
    const eventDate = new Date(validatedData.date)
    const [startHour, startMinute] = validatedData.startTime.split(':')
    
    const startDateTime = new Date(eventDate)
    startDateTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0)

    let endDateTime: Date | undefined
    if (validatedData.endTime) {
      const [endHour, endMinute] = validatedData.endTime.split(':')
      endDateTime = new Date(eventDate)
      endDateTime.setHours(parseInt(endHour), parseInt(endMinute), 0, 0)
    }

    const event = await prisma.event.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        type: validatedData.type,
        date: eventDate,
        startTime: startDateTime,
        endTime: endDateTime,
        location: validatedData.location,
        maxCapacity: validatedData.maxCapacity,
        semester: validatedData.semester,
        schoolYear: validatedData.schoolYear,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error("Error creating event:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 