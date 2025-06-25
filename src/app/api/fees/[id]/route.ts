import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { feeSchema } from "@/lib/validations"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const fee = await prisma.feeStructure.findUnique({
      where: {
        id: params.id,
        deletedAt: null,
        isActive: true,
      },
    })

    if (!fee) {
      return NextResponse.json({ error: "Fee not found" }, { status: 404 })
    }

    // Transform the data to match frontend expectations
    const transformedFee = {
      id: fee.id,
      name: fee.name,
      type: fee.type.toLowerCase().replace('_', ' '),
      amount: fee.amount,
      description: fee.description || "",
      dueDate: fee.dueDate ? fee.dueDate.toISOString().split('T')[0] : "",
      semester: fee.semester || "",
      schoolYear: fee.schoolYear,
      createdAt: fee.createdAt,
    }

    return NextResponse.json(transformedFee)
  } catch (error) {
    console.error("Error fetching fee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = feeSchema.parse(body)

    const updatedFee = await prisma.feeStructure.update({
      where: {
        id: params.id,
        deletedAt: null,
      },
      data: {
        name: validatedData.name,
        type: validatedData.type,
        amount: validatedData.amount,
        description: validatedData.description,
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        semester: validatedData.semester,
        schoolYear: validatedData.schoolYear,
      },
    })

    return NextResponse.json(updatedFee)
  } catch (error) {
    console.error("Error updating fee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Soft delete by setting deletedAt timestamp
    await prisma.feeStructure.update({
      where: {
        id: params.id,
      },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    })

    return NextResponse.json({ message: "Fee deleted successfully" })
  } catch (error) {
    console.error("Error deleting fee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 