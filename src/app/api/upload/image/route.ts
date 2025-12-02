import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins, college org, and course org can upload images
    if (!['ADMIN', 'COLLEGE_ORG', 'COURSE_ORG'].includes(session.user.role as any)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as unknown

    if (!file) {
      console.error('No file in form data')
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // In the Edge/Node runtime, formData.get returns a File-like object in practice,
    // but TypeScript can't safely use instanceof here. Use a structural check instead.
    const fileObj = file as any
    if (typeof fileObj.arrayBuffer !== 'function' || typeof fileObj.size !== 'number') {
      console.error('Invalid file object:', typeof file, file)
      return NextResponse.json({ error: 'Invalid file format' }, { status: 400 })
    }

    const fileType: string = typeof fileObj.type === 'string' ? fileObj.type : ''
    const fileName: string =
      typeof fileObj.name === 'string' && fileObj.name.trim() ? fileObj.name : 'uploaded-image'
    const fileSize: number = fileObj.size as number

    // Check file type
    if (!fileType || !fileType.startsWith('image/')) {
      console.error('Invalid file type:', fileType)
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 })
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (fileSize > maxSize) {
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2)
      return NextResponse.json({ error: `File size (${fileSizeMB}MB) exceeds the 10MB limit` }, { status: 400 })
    }

    const bytes = await fileObj.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'certificates')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const fileExtension = fileName.split('.').pop() || fileType.split('/').pop() || 'png'
    const filename = `logo_${timestamp}_${random}.${fileExtension}`

    // Save file
    const filepath = path.join(uploadDir, filename)
    await writeFile(filepath, buffer)

    // Return the URL path
    const imageUrl = `/uploads/certificates/${filename}`

    return NextResponse.json({
      url: imageUrl,
      filename: filename,
      size: fileSize,
      type: fileType,
      message: 'Image uploaded successfully'
    })

  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 