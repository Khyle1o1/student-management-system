import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PUT(
  request: NextRequest,
  { params }: { params: { eventId: string; recordId: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { eventId, recordId } = params
    const body = await request.json()

    // Verify the attendance record exists
    const existingRecord = await prisma.attendance.findUnique({
      where: { 
        id: recordId,
        eventId: eventId,
        deletedAt: null,
      },
    })

    if (!existingRecord) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 })
    }

    // Parse existing time data from notes
    let existingTimeData = { timeIn: null, timeOut: null }
    try {
      if (existingRecord.notes) {
        existingTimeData = JSON.parse(existingRecord.notes)
      }
    } catch (error) {
      console.log("Could not parse existing time data, using defaults")
    }

    // Update time data
    const timeData = {
      timeIn: body.timeIn || existingTimeData.timeIn,
      timeOut: body.timeOut || existingTimeData.timeOut,
    }

    // Update the attendance record
    const currentTime = new Date()
    
    const updatedRecord = await prisma.attendance.update({
      where: { id: recordId },
      data: {
        status: timeData.timeIn && timeData.timeOut ? "PRESENT" : timeData.timeIn ? "PRESENT" : "ABSENT",
        timestamp: currentTime,
        scannedAt: (body.scannedIn || body.scannedOut) ? currentTime : existingRecord.scannedAt,
        notes: JSON.stringify(timeData),
        updatedAt: currentTime,
      },
    })

    return NextResponse.json({
      id: updatedRecord.id,
      studentId: updatedRecord.studentId,
      eventId: updatedRecord.eventId,
      timeIn: timeData.timeIn,
      timeOut: timeData.timeOut,
      status: body.status,
      scannedIn: body.scannedIn || false,
      scannedOut: body.scannedOut || false,
      createdAt: updatedRecord.createdAt.toISOString(),
      updatedAt: updatedRecord.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error("Error updating attendance record:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { eventId: string; recordId: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { recordId } = params

    // Verify the attendance record exists
    const existingRecord = await prisma.attendance.findUnique({
      where: { id: recordId, deletedAt: null },
    })

    if (!existingRecord) {
      return NextResponse.json({ error: "Attendance record not found" }, { status: 404 })
    }

    // Soft delete the attendance record
    await prisma.attendance.update({
      where: { id: recordId },
      data: {
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({ message: "Attendance record deleted successfully" })
  } catch (error) {
    console.error("Error deleting attendance record:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 