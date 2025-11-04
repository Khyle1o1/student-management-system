import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { auth } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only students can upload receipts
    if (session.user.role !== 'USER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!session.user.studentId) {
      return NextResponse.json({ error: 'Student ID not found' }, { status: 400 })
    }

    const formData = await request.formData()
    const file: File | null = formData.get('file') as unknown as File
    const feeId = formData.get('feeId') as string
    const amount = formData.get('amount') as string

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!feeId) {
      return NextResponse.json({ error: 'Fee ID is required' }, { status: 400 })
    }

    if (!amount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 })
    }

    // Check file type - allow images and PDFs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Only image files (JPEG, PNG, GIF) and PDF files are allowed' 
      }, { status: 400 })
    }

    // Check file size (10MB limit for receipts)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Get student information
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('student_id', session.user.studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Verify fee exists
    const { data: fee, error: feeError } = await supabaseAdmin
      .from('fee_structures')
      .select('*')
      .eq('id', feeId)
      .single()

    if (feeError || !fee) {
      return NextResponse.json({ error: 'Fee not found' }, { status: 404 })
    }

    // Save the file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads/receipts directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'receipts')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = file.name.split('.').pop()?.toLowerCase() || 
                     (file.type === 'application/pdf' ? 'pdf' : 'jpg')
    const filename = `receipt_${student.student_id}_${feeId}_${timestamp}_${random}.${extension}`

    // Save file
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // Return the URL path
    const receiptUrl = `/uploads/receipts/${filename}`

    // Create or update payment record with receipt
    const paymentAmount = parseFloat(amount)
    const now = new Date().toISOString()

    // Check if payment already exists
    const { data: existingPayment, error: existingError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('student_id', student.id)
      .eq('fee_id', feeId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let payment
    if (existingPayment && existingPayment.approval_status === 'PENDING_APPROVAL') {
      // Update existing pending payment
      const { data: updatedPayment, error: updateError } = await supabaseAdmin
        .from('payments')
        .update({
          receipt_url: receiptUrl,
          amount: paymentAmount,
          approval_status: 'PENDING_APPROVAL',
          uploaded_at: now,
          updated_at: now,
        })
        .eq('id', existingPayment.id)
        .select(`
          *,
          student:students(
            id,
            student_id,
            name,
            email,
            college,
            course,
            year_level
          ),
          fee:fee_structures(
            id,
            name,
            amount,
            due_date,
            description,
            scope_type,
            scope_college,
            scope_course
          )
        `)
        .single()

      if (updateError) {
        console.error('Error updating payment:', updateError)
        return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
      }
      payment = updatedPayment
    } else {
      // Create new payment record
      const { data: newPayment, error: createError } = await supabaseAdmin
        .from('payments')
        .insert([{
          student_id: student.id,
          fee_id: feeId,
          amount: paymentAmount,
          payment_date: now,
          status: 'PENDING', // Will be updated to PAID when approved
          approval_status: 'PENDING_APPROVAL',
          receipt_url: receiptUrl,
          uploaded_at: now,
        }])
        .select(`
          *,
          student:students(
            id,
            student_id,
            name,
            email,
            college,
            course,
            year_level
          ),
          fee:fee_structures(
            id,
            name,
            amount,
            due_date,
            description,
            scope_type,
            scope_college,
            scope_course
          )
        `)
        .single()

      if (createError) {
        console.error('Error creating payment:', createError)
        return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 })
      }
      payment = newPayment
    }

    return NextResponse.json({
      success: true,
      payment,
      receiptUrl,
      message: 'Receipt uploaded successfully. Payment is pending approval.'
    })

  } catch (error) {
    console.error('Error uploading receipt:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

