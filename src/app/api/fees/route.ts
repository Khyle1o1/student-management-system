import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { feeSchema } from "@/lib/validations"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const fees = await prisma.feeStructure.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        type: true,
        amount: true,
        description: true,
        dueDate: true,
        semester: true,
        schoolYear: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Transform the data to match frontend expectations
    const transformedFees = fees.map(fee => ({
      id: fee.id,
      name: fee.name,
      type: fee.type.toLowerCase().replace('_', ' '),
      amount: fee.amount,
      description: fee.description || "",
      dueDate: fee.dueDate ? fee.dueDate.toISOString().split('T')[0] : "",
      semester: fee.semester || "",
      schoolYear: fee.schoolYear,
      createdAt: fee.createdAt,
    }))

    return NextResponse.json(transformedFees)
  } catch (error) {
    console.error("Error fetching fees:", error)
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
    const validatedData = feeSchema.parse(body)

    const fee = await prisma.feeStructure.create({
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

    return NextResponse.json(fee, { status: 201 })
  } catch (error) {
    console.error("Error creating fee:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 