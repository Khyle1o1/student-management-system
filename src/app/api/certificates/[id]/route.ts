import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'

// Certificate generation using jsPDF with template support
async function generateCertificatePDF(certificate: any, template: any): Promise<Buffer> {
  try {
    console.log('=== PDF Generation Debug ===')
    console.log('Template:', template.title)
    console.log('Dynamic fields:', template.dynamic_fields?.length || 0)
    console.log('Background design:', template.background_design)
    
    // Helper function to get field values
    const getFieldValue = (field: any): string => {
      switch (field.type) {
        case 'student_name':
          return certificate?.student?.name || 'Student Name'
        case 'event_name':
          return certificate?.event?.title || 'Event Name'
        case 'event_date':
          return certificate?.event?.date 
            ? format(new Date(certificate.event.date), 'MMMM dd, yyyy')
            : 'Event Date'
        case 'certificate_number':
          return certificate?.certificate_number || 'N/A'
        case 'institution_name':
          return 'Bukidnon State University'
        case 'custom_text':
          return field.custom_text || field.label || 'Custom Text'
        default:
          return field.label || 'Field'
      }
    }

    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    // Get safe values
    const studentName = certificate?.student?.name || 'Student Name'
    const eventTitle = certificate?.event?.title || 'Event Name'
    const eventDate = certificate?.event?.date 
      ? format(new Date(certificate.event.date), 'MMMM dd, yyyy')
      : 'Event Date'
    const certificateNumber = certificate?.certificate_number || 'N/A'
    const generatedDate = format(new Date(), 'MMMM dd, yyyy')

    // Apply template background design
    const bgDesign = template?.background_design || {}
    
    console.log('Background design:', bgDesign)
    
    // Handle background image if it exists
    if (bgDesign.design_type === 'image' && bgDesign.certificate_background) {
      try {
        console.log('Loading background image:', bgDesign.certificate_background)
        
        // Load the background image - handle both relative and absolute URLs
        let imageUrl = bgDesign.certificate_background
        
        // If it's a relative URL, make it absolute
        if (imageUrl.startsWith('/')) {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          imageUrl = `${baseUrl}${imageUrl}`
        }
        
        console.log('Full image URL:', imageUrl)
        
        // Fetch the image with proper headers
        const imageResponse = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        })
        
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer()
          const uint8Array = new Uint8Array(imageBuffer)
          
          console.log('Image loaded successfully, size:', uint8Array.length, 'bytes')
          
          // Determine image format based on file extension or content-type
          const contentType = imageResponse.headers.get('content-type') || ''
          let imageFormat = 'JPEG' // default
          
          if (contentType.includes('png') || bgDesign.certificate_background.toLowerCase().includes('.png')) {
            imageFormat = 'PNG'
          } else if (contentType.includes('gif') || bgDesign.certificate_background.toLowerCase().includes('.gif')) {
            imageFormat = 'GIF'
          } else if (contentType.includes('webp') || bgDesign.certificate_background.toLowerCase().includes('.webp')) {
            imageFormat = 'WEBP'
          }
          
          console.log('Image format detected:', imageFormat)
          
          // Add image to PDF as background covering the full page
          doc.addImage(uint8Array, imageFormat, 0, 0, 297, 210, undefined, 'FAST')
          console.log('Background image added successfully to PDF')
        } else {
          console.error('Failed to load background image:', imageResponse.status, imageResponse.statusText)
          console.error('Response headers:', Object.fromEntries(imageResponse.headers.entries()))
          
          // Continue with fallback design - don't fail PDF generation
          console.log('Falling back to custom design')
          applyCustomDesign()
        }
      } catch (imageError) {
        console.error('Error loading background image:', imageError)
        console.error('Error details:', imageError instanceof Error ? imageError.message : String(imageError))
        
        // Continue with fallback design - don't fail PDF generation
        console.log('Falling back to custom design due to error')
        applyCustomDesign()
      }
    } else {
      // Apply custom background design
      applyCustomDesign()
    }

    // Helper function to apply custom design
    function applyCustomDesign() {
      console.log('Applying custom design')
      
      // Set background color if specified
      if (bgDesign.background_color && bgDesign.background_color !== '#ffffff') {
        doc.setFillColor(bgDesign.background_color)
        doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, 'F')
      }

      // Add border if specified
      if (bgDesign.border_width && bgDesign.border_width > 0) {
        const borderWidth = bgDesign.border_width / 10 // Convert to mm
        doc.setLineWidth(borderWidth)
        doc.setDrawColor(bgDesign.border_color || '#000000')
        const margin = borderWidth / 2
        doc.rect(margin, margin, doc.internal.pageSize.width - borderWidth, doc.internal.pageSize.height - borderWidth, 'S')
      }

      // TODO: Add logo support in future if needed
      // if (bgDesign.logo_url && bgDesign.logo_position) {
      //   // Logo implementation would go here
      // }
    }

    // Check if template has dynamic fields
    const hasDynamicFields = template?.dynamic_fields && Array.isArray(template.dynamic_fields) && template.dynamic_fields.length > 0

    console.log('Has dynamic fields:', hasDynamicFields)

    if (hasDynamicFields) {
      // Use template dynamic fields with proper coordinate scaling
      template.dynamic_fields.forEach((field: any, index: number) => {
        const value = getFieldValue(field)
        
        // Precise coordinate scaling calculation
        const scaleX = 297 / 2000  // PDF width / template width
        const scaleY = 210 / 1414  // PDF height / template height
        
        const scaledX = field.position.x * scaleX
        const scaledY = field.position.y * scaleY
        
        // Adjust font size scaling
        const fontSize = Math.max(8, Math.min(36, (field.style?.font_size || 16) * 0.35)) // Scale font size
        
        // Set font and styling
        doc.setFontSize(fontSize)
        
        const fontFamily = field.style?.font_family || 'helvetica'
        const fontWeight = field.style?.font_weight || 'normal'
        
        try {
          if (fontWeight === 'bold') {
            doc.setFont(fontFamily.toLowerCase(), 'bold')
          } else {
            doc.setFont(fontFamily.toLowerCase(), 'normal')
          }
        } catch (fontError) {
          // Fallback to helvetica if font not available
          doc.setFont('helvetica', fontWeight === 'bold' ? 'bold' : 'normal')
        }
        
        // Set text color
        if (field.style?.color) {
          const color = field.style.color
          if (color.startsWith('#')) {
            const hex = color.substring(1)
            const r = parseInt(hex.substring(0, 2), 16)
            const g = parseInt(hex.substring(2, 4), 16)
            const b = parseInt(hex.substring(4, 6), 16)
            doc.setTextColor(r, g, b)
          } else {
            doc.setTextColor('#000000')
          }
        } else {
          doc.setTextColor('#000000')
        }
        
        // Special handling for student name to match template preview
        if (field.type === 'student_name') {
          // Precise positioning for student name
          const studentNameX = 148.5  // Center of A4 landscape
          const studentNameY = 82  // Vertical position from top
          
          // Set font to match template exactly
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(24)  // Matches the template's font size
          doc.setTextColor(0, 0, 0)  // Black color
          
          // Add text with exact centering
          doc.text(value.toUpperCase(), studentNameX, studentNameY, { 
            align: 'center',
            maxWidth: 200  // Limit text width to prevent overflow
          })
        } else {
          // For other fields, use original positioning
          doc.text(value, scaledX, scaledY)
        }
      })
    } else {
      // Fallback to default layout when no dynamic fields
      console.log('No dynamic fields found, using fallback layout')
      
      // Add a decorative border
      doc.setLineWidth(1)
      doc.setDrawColor('#cccccc')
      doc.rect(15, 15, 267, 180, 'S')
      
      // Title with background
      doc.setFillColor('#f8f9fa')
      doc.rect(25, 25, 247, 25, 'F')
      doc.setFontSize(28)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#2c3e50')
      doc.text('Certificate of Participation', 148.5, 42, { align: 'center' })
      
      // Student name section
      doc.setFillColor('#e8f4f8')
      doc.rect(35, 65, 227, 20, 'F')
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#1a365d')
      doc.text('This is to certify that', 148.5, 72, { align: 'center' })
      doc.text(studentName, 148.5, 82, { align: 'center' })
      
      // Participation text
      doc.setFontSize(16)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#4a5568')
      doc.text('has successfully participated in', 148.5, 100, { align: 'center' })
      
      // Event title section
      doc.setFillColor('#f0f8e8')
      doc.rect(35, 110, 227, 20, 'F')
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#2f855a')
      doc.text(eventTitle, 148.5, 125, { align: 'center' })
      
      // Event date
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor('#4a5568')
      doc.text(`held on ${eventDate}`, 148.5, 140, { align: 'center' })
      
      // Certificate number
      doc.setFontSize(10)
      doc.setTextColor('#718096')
      doc.text(`Certificate Number: ${certificateNumber}`, 148.5, 155, { align: 'center' })
      
      // Institution name
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor('#2c3e50')
      doc.text('Bukidnon State University', 148.5, 175, { align: 'center' })
      
      // Generation date
      doc.setFontSize(8)
      doc.setTextColor('#a0aec0')
      doc.text(`Generated on ${generatedDate}`, 148.5, 185, { align: 'center' })
    }

    // Add footer information
    doc.setFontSize(6)
    doc.setTextColor('#cbd5e0')
    doc.text('Student Management System - Certificate Generator', 10, 205, { align: 'left' })
    doc.text(`Document ID: ${certificate?.id || 'N/A'}`, 287, 205, { align: 'right' })

    // Convert to buffer using the most reliable method
    let pdfBuffer: Buffer
    try {
      // Use string output method which is most reliable
      const pdfBytes = doc.output('arraybuffer')
      pdfBuffer = Buffer.from(pdfBytes)
      
      // Log detailed information for debugging
      console.log('Initial buffer size:', pdfBuffer.length)
      console.log('Buffer type:', typeof pdfBytes)
      console.log('First 20 bytes:', pdfBuffer.slice(0, 20))
      
    } catch (bufferError) {
      console.error('Error creating buffer:', bufferError)
      throw new Error('PDF generation failed - unable to create buffer')
    }
    
    // Validate PDF buffer
    if (pdfBuffer.length === 0) {
      throw new Error('Generated PDF is empty')
    }
    
    if (pdfBuffer.length < 100) {
      throw new Error(`Generated PDF is too small (${pdfBuffer.length} bytes)`)
    }
    
    // Check if PDF starts with proper header
    const pdfHeader = pdfBuffer.slice(0, 4).toString()
    if (!pdfHeader.startsWith('%PDF')) {
      console.log('PDF header check failed, header:', pdfHeader)
      console.log('Buffer preview:', pdfBuffer.slice(0, 50).toString())
      // Don't throw error yet, let's see what happens
      console.warn('PDF header validation failed, but continuing...')
    }
    
    console.log('PDF generated successfully with jsPDF, buffer size:', pdfBuffer.length)
    return pdfBuffer
    
  } catch (error) {
    console.error('Error generating PDF with jsPDF:', error)
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== API Route Debug Start ===')
    const session = await auth()
    console.log('Session check:', !!session, session?.user?.role)
    
    if (!session) {
      console.log('No session, returning 401')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') // 'view' or 'download'
    
    console.log('Route parameters:', { id, action })
    console.log('Full URL:', request.url)

    // Get certificate with related data
    console.log('Fetching certificate from database...')
    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        *,
        event:events(
          id,
          title,
          date,
          location,
          require_evaluation
        ),
        student:students(
          id,
          student_id,
          name,
          email,
          college,
          course
        )
      `)
      .eq('id', id)
      .single()

    console.log('Certificate fetch result:', { 
      hasData: !!certificate, 
      error: error?.message,
      certificateId: certificate?.id 
    })

    if (error) {
      console.log('Database error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
      }
      console.error('Error fetching certificate:', error)
      return NextResponse.json({ error: 'Failed to fetch certificate' }, { status: 500 })
    }

    console.log('Certificate data:', {
      id: certificate.id,
      is_accessible: certificate.is_accessible,
      student_id: certificate.student_id,
      event_id: certificate.event_id,
      hasStudent: !!certificate.student,
      hasEvent: !!certificate.event
    })

    // Check access permissions
    console.log('Checking access permissions...')
    if (session.user.role === 'STUDENT') {
      console.log('Student access check...')
      // Students can only access their own certificates
      const { data: studentRecord, error: studentError } = await supabase
        .from('students')
        .select('id')
        .eq('student_id', session.user.studentId)
        .single()

      console.log('Student record check:', {
        hasRecord: !!studentRecord,
        error: studentError?.message,
        recordId: studentRecord?.id,
        certificateStudentId: certificate.student_id,
        match: studentRecord?.id === certificate.student_id
      })

      if (studentError || !studentRecord || studentRecord.id !== certificate.student_id) {
        console.log('Access denied - student mismatch')
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      // Check if certificate is accessible (evaluation completed if required)
      console.log('Certificate accessibility check:', {
        is_accessible: certificate.is_accessible,
        requires_evaluation: certificate.event.require_evaluation
      })
      
      if (!certificate.is_accessible) {
        console.log('Certificate not accessible:', {
          certificateId: id,
          isAccessible: certificate.is_accessible,
          requiresEvaluation: certificate.event.require_evaluation
        })
        return NextResponse.json({ 
          error: 'Certificate not yet accessible. Please complete the event evaluation first.',
          requires_evaluation: certificate.event.require_evaluation,
          certificate_id: id
        }, { status: 403 })
      }
    }

    // Additional validation for PDF generation
    console.log('PDF generation validation...')
    if (action === 'download' || action === 'view') {
      console.log('Action is download/view, validating certificate data...')
      // Validate certificate data
      if (!certificate.student || !certificate.event) {
        console.error('Certificate missing required data:', {
          hasStudent: !!certificate.student,
          hasEvent: !!certificate.event
        })
        return NextResponse.json({ error: 'Certificate data incomplete' }, { status: 400 })
      }

      console.log('Certificate data validation passed, proceeding to PDF generation...')
    }

    // If this is a download or view request, generate and return PDF
    if (action === 'download' || action === 'view') {
      console.log('=== Starting PDF Generation Process ===')
      
      let templateId = certificate.certificate_template_id

      // If template ID is not in certificate record, get it from event_certificate_templates
      if (!templateId) {
        console.log('No template ID in certificate record, looking up from event_certificate_templates')
        const { data: eventTemplate, error: eventTemplateError } = await supabase
          .from('event_certificate_templates')
          .select('certificate_template_id')
          .eq('event_id', certificate.event_id)
          .single()

        if (eventTemplateError || !eventTemplate) {
          console.log('No template found, creating default template')
          // Create a default template for this event if none exists
          const defaultTemplate = {
            title: `Default Template for ${certificate.event.title}`,
            description: 'Auto-generated default certificate template',
            background_design: {
              background_color: '#ffffff',
              border_color: '#000000',
              border_width: 2,
              logo_position: 'top-center',
              pattern: 'none'
            },
            dynamic_fields: [
              {
                id: 'student_name',
                type: 'student_name',
                label: 'Student Name',
                position: { x: 1000, y: 500 },
                style: {
                  font_family: 'Arial',
                  font_size: 24,
                  font_weight: 'bold',
                  color: '#000000',
                  text_align: 'center'
                }
              },
              {
                id: 'event_name',
                type: 'event_name',
                label: 'Event Name',
                position: { x: 1000, y: 400 },
                style: {
                  font_family: 'Arial',
                  font_size: 20,
                  font_weight: 'normal',
                  color: '#000000',
                  text_align: 'center'
                }
              },
              {
                id: 'certificate_number',
                type: 'certificate_number',
                label: 'Certificate Number',
                position: { x: 1000, y: 1200 },
                style: {
                  font_family: 'Arial',
                  font_size: 12,
                  font_weight: 'normal',
                  color: '#000000',
                  text_align: 'center'
                }
              }
            ],
            template_html: `<div class="certificate-container">
              <div class="certificate-content">
                <h1>Certificate of Participation</h1>
                <div class="fields-container">
                  {{fields}}
                </div>
              </div>
            </div>`,
            template_css: `
              .certificate-container {
                width: 2000px;
                height: 1414px;
                background: white;
                border: 2px solid #000000;
                position: relative;
                font-family: Arial, sans-serif;
              }
              .certificate-content {
                padding: 50px;
                text-align: center;
              }
              .fields-container {
                position: relative;
                width: 100%;
                height: 100%;
              }
            `,
            is_active: true
          }

          // Create the default template
          const { data: newTemplate, error: createTemplateError } = await supabase
            .from('certificate_templates')
            .insert([{
              ...defaultTemplate,
              created_by: session.user.id
            }])
            .select()
            .single()

          if (createTemplateError) {
            console.error('Error creating default template:', createTemplateError)
            return NextResponse.json({ error: 'Failed to create default certificate template' }, { status: 500 })
          }

          // Link the template to the event
          const { error: linkError } = await supabase
            .from('event_certificate_templates')
            .insert([{
              event_id: certificate.event_id,
              certificate_template_id: newTemplate.id
            }])

          if (linkError) {
            console.error('Error linking template to event:', linkError)
            // Continue anyway, we have the template
          }

          templateId = newTemplate.id
          console.log('Created default template with ID:', templateId)
        } else {
          templateId = eventTemplate.certificate_template_id
          console.log('Found template ID:', templateId)
        }
      } else {
        console.log('Using template ID from certificate record:', templateId)
      }

      // Get the certificate template
      const { data: template, error: templateError } = await supabase
        .from('certificate_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError || !template) {
        console.error('Template not found:', templateError)
        return NextResponse.json({ error: 'Certificate template not found' }, { status: 404 })
      }

      console.log('Template found:', template.title)

      try {
        console.log('Starting PDF generation...')
        // Generate PDF
        const pdfBuffer = await generateCertificatePDF(certificate, template)
        console.log('PDF generated successfully, buffer size:', pdfBuffer.length)

        // Additional validation before sending response
        if (!pdfBuffer || pdfBuffer.length === 0) {
          throw new Error('PDF buffer is empty or null')
        }

        // Additional buffer validation
        console.log('Buffer validation:', {
          length: pdfBuffer.length,
          isBuffer: Buffer.isBuffer(pdfBuffer),
          first10Bytes: pdfBuffer.slice(0, 10).toString('hex'),
          hasPDFHeader: pdfBuffer.slice(0, 4).toString() === '%PDF'
        })

        // Try to ensure buffer is valid
        if (pdfBuffer.length < 1000) {
          console.warn('PDF buffer is unusually small, this might cause issues')
        }

        // Log access before returning PDF
        try {
          const headersList = await headers()
          const userAgent = headersList.get('user-agent') || null
          const forwarded = headersList.get('x-forwarded-for')
          const realIP = headersList.get('x-real-ip')
          const ipAddress = forwarded ? forwarded.split(',')[0] : realIP

          // Get student ID for access log
          let logStudentId = null
          if (session.user.role === 'STUDENT') {
            const { data: studentRecord } = await supabase
              .from('students')
              .select('id')
              .eq('student_id', session.user.studentId)
              .single()
            logStudentId = studentRecord?.id || null
          }

          const { error: logError } = await supabase
            .from('certificate_access_log')
            .insert([{
              certificate_id: id,
              student_id: logStudentId,
              access_type: action.toUpperCase(),
              ip_address: ipAddress,
              user_agent: userAgent
            }])

          if (logError) {
            console.error('Error logging certificate access:', logError)
            // Don't fail the request for logging errors
          }
        } catch (logError) {
          console.error('Error in access logging:', logError)
          // Don't fail the request for logging errors
        }

        // Return PDF as response with appropriate headers
        const isDownload = action === 'download'
        const contentDisposition = isDownload 
          ? `inline; filename="certificate-${certificate.certificate_number}.pdf"`
          : `inline; filename="certificate-${certificate.certificate_number}.pdf"`

        console.log('Creating response with headers:', {
          contentType: 'application/pdf',
          contentDisposition,
          contentLength: pdfBuffer.length,
          isDownload
        })

        // Try different approaches to create the response
        try {
          // Create response with explicit status and headers
          const headers = new Headers({
            'Content-Type': 'application/pdf',
            'Content-Disposition': contentDisposition,
            'Content-Length': pdfBuffer.length.toString(),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Accept-Ranges': 'bytes',
            'X-Content-Type-Options': 'nosniff'
          })

          console.log('Headers created:', Object.fromEntries(headers.entries()))

          const response = new Response(pdfBuffer, {
            status: 200,
            statusText: 'OK',
            headers: headers
          })

          console.log('Response created successfully, returning PDF')
          console.log('Response status:', response.status)
          console.log('Response headers:', Object.fromEntries(response.headers.entries()))
          
          return response
        } catch (responseError) {
          console.error('Error creating Response:', responseError)
          
          // Fallback: try with NextResponse
          console.log('Trying NextResponse as fallback...')
          return new NextResponse(pdfBuffer, {
            status: 200,
            headers: {
              'Content-Type': 'application/pdf',
              'Content-Disposition': contentDisposition,
              'Content-Length': pdfBuffer.length.toString(),
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'Accept-Ranges': 'bytes',
              'X-Content-Type-Options': 'nosniff'
            }
          })
        }
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError)
        return NextResponse.json({ 
          error: 'Failed to generate PDF', 
          details: pdfError instanceof Error ? pdfError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

    // For non-download/view actions, return certificate data
    console.log('Returning certificate data for non-download action')
    return NextResponse.json({
      ...certificate,
      access_granted: true
    })

  } catch (error) {
    console.error('Error in GET /api/certificates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Only allow updating accessibility status for now
    const updateData: any = {}
    if (body.is_accessible !== undefined) {
      updateData.is_accessible = body.is_accessible
    }
    if (body.file_path !== undefined) {
      updateData.file_path = body.file_path
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: certificate, error } = await supabase
      .from('certificates')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        event:events(
          id,
          title,
          date
        ),
        student:students(
          id,
          student_id,
          name,
          email
        )
      `)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
      }
      console.error('Error updating certificate:', error)
      return NextResponse.json({ error: 'Failed to update certificate' }, { status: 500 })
    }

    return NextResponse.json(certificate)

  } catch (error) {
    console.error('Error in PATCH /api/certificates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    // Check if certificate exists
    const { data: certificate, error: fetchError } = await supabase
      .from('certificates')
      .select('id, student_id, event_id')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Certificate not found' }, { status: 404 })
      }
      console.error('Error fetching certificate:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch certificate' }, { status: 500 })
    }

    // Delete access logs first (due to foreign key constraint)
    const { error: accessLogError } = await supabase
      .from('certificate_access_log')
      .delete()
      .eq('certificate_id', id)

    if (accessLogError) {
      console.error('Error deleting access logs:', accessLogError)
      return NextResponse.json({ error: 'Failed to delete certificate access logs' }, { status: 500 })
    }

    // Delete the certificate
    const { error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting certificate:', error)
      return NextResponse.json({ error: 'Failed to delete certificate' }, { status: 500 })
    }

    // Update attendance record to mark certificate as not generated
    const { error: updateError } = await supabase
      .from('attendance')
      .update({ certificate_generated: false })
      .eq('event_id', certificate.event_id)
      .eq('student_id', certificate.student_id)

    if (updateError) {
      console.error('Error updating attendance record:', updateError)
      // Don't fail deletion for this
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error in DELETE /api/certificates/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 