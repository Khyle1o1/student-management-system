import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE() {
  try {
    const session = await auth()
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Soft delete all students by setting deletedAt
    await prisma.student.updateMany({
      where: {
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    })

    return NextResponse.json({ message: "All students have been deleted" })
  } catch (error) {
    console.error("Error deleting students:", error)
    return NextResponse.json(
      { error: "An error occurred while deleting students" },
      { status: 500 }
    )
  }
} 