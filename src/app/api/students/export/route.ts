import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Authenticate user
    const session = await auth()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch students data
    const students = await prisma.student.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        studentId: true,
        name: true,
        user: {
          select: { email: true },
        },
        course: true,
        yearLevel: true,
        enrolledAt: true,
        college: true,
      } as any,
      orderBy: {
        name: "asc",
      },
    })

    // CSV headers
    const csvLines: string[] = []
    csvLines.push(
      "Student ID,Student Name,Email,College,Course,Year Level,Enrolled Date"
    )

    // Helper to convert YEAR_1 -> 1st Year, etc.
    const getYearLevelDisplayText = (yearLevel: string) => {
      switch (yearLevel) {
        case "YEAR_1":
          return "1st Year"
        case "YEAR_2":
          return "2nd Year"
        case "YEAR_3":
          return "3rd Year"
        case "YEAR_4":
          return "4th Year"
        default:
          return yearLevel
      }
    }

    (students as any[]).forEach((student) => {
      const line = [
        student.studentId,
        `"${student.name}"`,
        student.user?.email ?? "",
        student.college,
        student.course,
        getYearLevelDisplayText(student.yearLevel),
        new Date(student.enrolledAt).toLocaleDateString("en-US"),
      ].join(",")

      csvLines.push(line)
    })

    const csvContent = csvLines.join("\n")

    const headers = new Headers()
    headers.set("Content-Type", "text/csv; charset=utf-8")

    const today = new Date().toISOString().split("T")[0]
    headers.set(
      "Content-Disposition",
      `attachment; filename="students_export_${today}.csv"`
    )

    return new NextResponse(csvContent, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Error generating students export:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 