import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { auth } from "@/lib/auth"
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'

// Sample certificate generation using jsPDF with template support
async function generateSampleCertificatePDF(template: any): Promise<Buffer> {
  try {
    console.log('=== Sample PDF Generation Debug ===')
    console.log('Template:', template.title)
    console.log('Dynamic fields:', template.dynamic_fields?.length || 0)
    console.log('Background design:', template.background_design)
    
    // Helper function to get sample field values
    const getSampleFieldValue = (field: any): string => {
      switch (field.type) {
        case 'student_name':
          return 'BOGART THE DOG'
        case 'event_name':
          return '2ND GENERAL ASSEMBLY'
        case 'event_date':
          return 'January 16, 2016'
        case 'certificate_number':
          return 'CERT-2024-001'
        case 'institution_name':
          return 'Bukidnon State University'
        case 'custom_text':
          return field.custom_text || 'Custom Text'
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

    // Get document dimensions
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Handle image-based certificates
    if (template.background_design?.design_type === "image" && template.background_design?.certificate_background) {
      try {
        console.log('Loading background image:', template.background_design.certificate_background)
        
        // Load the background image - handle both relative and absolute URLs
        let imageUrl = template.background_design.certificate_background
        
        // If it's a relative URL, make it absolute
        if (imageUrl.startsWith('/')) {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          imageUrl = `${baseUrl}${imageUrl}`
        }
        
        // If it's still a relative URL (doesn't start with http), try to make it absolute
        if (!imageUrl.startsWith('http')) {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          imageUrl = `${baseUrl}/${imageUrl}`
        }
        
        console.log('Full image URL:', imageUrl)
        
        // Try multiple URL formats if the first one fails
        const urlAttempts = [
          imageUrl,
          imageUrl.replace('http://', 'https://'),
          imageUrl.replace('https://', 'http://'),
          // Try direct file system access for local development
          imageUrl.includes('/uploads/') ? imageUrl.replace('http://localhost:3000', 'http://localhost:3000') : imageUrl,
          imageUrl.includes('/uploads/') ? imageUrl.replace('https://localhost:3000', 'http://localhost:3000') : imageUrl
        ]
        
        let imageLoaded = false
        let uint8Array: Uint8Array | null = null
        let imageFormat = 'JPEG'
        
        for (const attemptUrl of urlAttempts) {
          try {
            console.log('Attempting to load image from:', attemptUrl)
            
            // Fetch the image with proper headers
            const imageResponse = await fetch(attemptUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            })
            
            if (imageResponse.ok) {
              const imageBuffer = await imageResponse.arrayBuffer()
              uint8Array = new Uint8Array(imageBuffer)
              
              console.log('Image loaded successfully, size:', uint8Array.length, 'bytes')
              
              // Determine image format based on file extension or content-type
              const contentType = imageResponse.headers.get('content-type') || ''
              
              if (contentType.includes('png') || attemptUrl.toLowerCase().includes('.png')) {
                imageFormat = 'PNG'
              } else if (contentType.includes('gif') || attemptUrl.toLowerCase().includes('.gif')) {
                imageFormat = 'GIF'
              } else if (contentType.includes('webp') || attemptUrl.toLowerCase().includes('.webp')) {
                imageFormat = 'WEBP'
              }
              
              console.log('Image format detected:', imageFormat)
              imageLoaded = true
              break
            } else {
              console.log(`Failed to load from ${attemptUrl}:`, imageResponse.status)
            }
          } catch (error) {
            console.log(`Error loading from ${attemptUrl}:`, error)
          }
        }
        
        if (imageLoaded && uint8Array) {
          // Add image to PDF as background covering the full page
          doc.addImage(uint8Array, imageFormat, 0, 0, 297, 210, undefined, 'FAST')
          console.log('Background image added successfully to PDF')
          
          // For image-based certificates, the background image contains all design elements
          // We only need to add dynamic fields on top if they exist
          if (template.dynamic_fields && template.dynamic_fields.length > 0) {
            console.log('Adding dynamic fields on top of background image')
            console.log('Dynamic fields count:', template.dynamic_fields.length)
            
            // Scale positions from template preview dimensions (2000x1414) to PDF dimensions (297x210mm)
            // Template preview uses 2000x1414px canvas, PDF uses 297x210mm
            const scaleX = 297 / 2000  // PDF width / template width
            const scaleY = 210 / 1414  // PDF height / template height
            
            template.dynamic_fields.forEach((field: any, index: number) => {
              console.log(`Image-based field ${index}:`, field)
              const value = getSampleFieldValue(field)
              console.log(`Image-based field ${index} value:`, value)
              
              // Use template positions with proper scaling (same as preview)
              const x = field.position.x * scaleX
              const y = field.position.y * scaleY
              
              console.log(`Image-based field ${index} position - Original: (${field.position.x}, ${field.position.y}), Scaled: (${x}, ${y})`)
              
              // Use font properties from template
              const fontSize = Math.max(8, Math.min(36, (field.style?.font_size || 16) * scaleX))
              console.log(`Image-based field ${index} font size - Original: ${field.style?.font_size || 16}, Scaled: ${fontSize}`)
              
              doc.setFontSize(fontSize)
              
              // Use font family and weight from template
              const fontFamily = (field.style?.font_family || 'helvetica').toLowerCase()
              const fontWeight = field.style?.font_weight || 'normal'
              
              try {
                if (fontWeight === 'bold') {
                  doc.setFont(fontFamily, 'bold')
                } else {
                  doc.setFont(fontFamily, 'normal')
                }
              } catch (fontError) {
                // Fallback to helvetica if font not available
                doc.setFont('helvetica', fontWeight === 'bold' ? 'bold' : 'normal')
              }
              
              // Set text color from template
              if (field.style?.color) {
                const color = field.style.color
                if (color.startsWith('#')) {
                  const hex = color.substring(1)
                  const r = parseInt(hex.substring(0, 2), 16)
                  const g = parseInt(hex.substring(2, 4), 16)
                  const b = parseInt(hex.substring(4, 6), 16)
                  doc.setTextColor(r, g, b)
                } else {
                  doc.setTextColor(0, 0, 0)
                }
              } else {
                doc.setTextColor(0, 0, 0)
              }
              
              // Add text with shadow for better visibility on background images
              console.log(`Adding image-based text "${value}" at position (${x}, ${y})`)
              
              // Add white shadow for better visibility
              doc.setTextColor(255, 255, 255) // White shadow
              doc.text(value, x + 1, y + 1, { 
                align: field.style?.text_align || 'center',
                maxWidth: 200
              })
              
              // Add main text
              const textColor = field.style?.color || '#000000'
              if (textColor.startsWith('#')) {
                const hex = textColor.substring(1)
                const r = parseInt(hex.substring(0, 2), 16)
                const g = parseInt(hex.substring(2, 4), 16)
                const b = parseInt(hex.substring(4, 6), 16)
                doc.setTextColor(r, g, b)
              } else {
                doc.setTextColor(0, 0, 0)
              }
              doc.text(value, x, y, { 
                align: field.style?.text_align || 'center',
                maxWidth: 200
              })
            })
          } else {
            console.log('No dynamic fields found for image-based certificate')
          }
          
          // Add sample watermark
          doc.setFontSize(12)
          doc.setTextColor('#cccccc')
          doc.text('SAMPLE CERTIFICATE', pageWidth / 2, pageHeight - 10, { align: 'center' })

          // Add footer information
          doc.setFontSize(6)
          doc.setTextColor('#cbd5e0')
      doc.text('SmartU - Certificate Generator', 10, 205, { align: 'left' })
          doc.text(`Sample Template: ${template.id}`, 287, 205, { align: 'right' })

          // Convert to buffer
          const pdfBytes = doc.output('arraybuffer')
          const pdfBuffer = Buffer.from(pdfBytes)
          
          console.log('Sample PDF generated successfully with background image, buffer size:', pdfBuffer.length)
          return pdfBuffer
        } else {
          console.error('Failed to load background image from all attempts')
          
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
      
      const bgDesign = template.background_design || {}
      
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

      // Add logo if present
      if (bgDesign.logo_url) {
        try {
          const logo = new Image()
          logo.src = bgDesign.logo_url
          
          // Note: Logo loading is synchronous in this context
          // In a real implementation, you might want to handle this differently
          const logoWidth = 40
          const logoHeight = 30
          let logoX = 10
          let logoY = 10

          // Position logo based on setting
          switch (bgDesign.logo_position) {
            case 'top-center':
              logoX = (pageWidth - logoWidth) / 2
              break
            case 'top-right':
              logoX = pageWidth - logoWidth - 10
              break
            case 'center':
              logoX = (pageWidth - logoWidth) / 2
              logoY = (pageHeight - logoHeight) / 2
              break
            default: // top-left
              logoX = 10
              logoY = 10
          }

          // For now, skip logo in sample generation to avoid async issues
          // doc.addImage(logo, 'JPEG', logoX, logoY, logoWidth, logoHeight)
        } catch (logoError) {
          console.error('Error loading logo:', logoError)
        }
      }
    }

    // Check if template has dynamic fields
    const hasDynamicFields = template?.dynamic_fields && Array.isArray(template.dynamic_fields) && template.dynamic_fields.length > 0

    console.log('=== DYNAMIC FIELDS DEBUG ===')
    console.log('Template dynamic_fields:', template?.dynamic_fields)
    console.log('Has dynamic fields:', hasDynamicFields)
    console.log('Dynamic fields length:', template?.dynamic_fields?.length || 0)
    
    if (hasDynamicFields) {
      console.log('Processing dynamic fields...')
      
      // Scale positions from template preview dimensions (2000x1414) to PDF dimensions (297x210mm)
      // Template preview uses 2000x1414px canvas, PDF uses 297x210mm
      const scaleX = 297 / 2000  // PDF width / template width
      const scaleY = 210 / 1414  // PDF height / template height
      
      template.dynamic_fields.forEach((field: any, index: number) => {
        console.log(`Field ${index}:`, field)
        const value = getSampleFieldValue(field)
        console.log(`Field ${index} value:`, value)
        
        // Use template positions with proper scaling (same as preview and image-based certificates)
        const x = field.position.x * scaleX
        const y = field.position.y * scaleY
        
        console.log(`Field ${index} position - Original: (${field.position.x}, ${field.position.y}), Scaled: (${x}, ${y})`)
        
        // Set font properties - scale font size proportionally
        const fontSize = Math.max(8, Math.min(36, (field.style?.font_size || 16) * scaleX))
        console.log(`Field ${index} font size - Original: ${field.style?.font_size || 16}, Scaled: ${fontSize}`)
        
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
            doc.setTextColor(0, 0, 0)
          }
        } else {
          doc.setTextColor(0, 0, 0)
        }
        
        // Add text with proper positioning
        console.log(`Adding text "${value}" at position (${x}, ${y})`)
        doc.text(value, x, y, { 
          align: field.style?.text_align || 'center',
          maxWidth: 200
        })
      })
      console.log('Finished processing dynamic fields')
    } else {
      console.log('No dynamic fields found or dynamic fields is not an array')
    }
    console.log('=== END DYNAMIC FIELDS DEBUG ===')

    // Fallback to default layout when no dynamic fields (same as actual certificate generation)
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
    doc.text('BOGART THE DOG', 148.5, 82, { align: 'center' })
    
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
    doc.text('2ND GENERAL ASSEMBLY', 148.5, 125, { align: 'center' })
    
    // Event date
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor('#4a5568')
    doc.text(`held on January 16, 2016`, 148.5, 140, { align: 'center' })
    
    // Certificate number
    doc.setFontSize(10)
    doc.setTextColor('#718096')
    doc.text(`Certificate Number: CERT-2024-001`, 148.5, 155, { align: 'center' })
    
    // Institution name
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor('#2c3e50')
    doc.text('Bukidnon State University', 148.5, 175, { align: 'center' })
    
    // Generation date
    doc.setFontSize(8)
    doc.setTextColor('#a0aec0')
    doc.text(`Generated on ${format(new Date(), 'MMMM dd, yyyy')}`, 148.5, 185, { align: 'center' })

    // Add sample watermark
    doc.setFontSize(12)
    doc.setTextColor('#cccccc')
    doc.text('SAMPLE CERTIFICATE', pageWidth / 2, pageHeight - 10, { align: 'center' })

    // Add footer information
    doc.setFontSize(6)
    doc.setTextColor('#cbd5e0')
    doc.text('SmartU - Certificate Generator', 10, 205, { align: 'left' })
    doc.text(`Sample Template: ${template.id}`, 287, 205, { align: 'right' })

    // Convert to buffer
    const pdfBytes = doc.output('arraybuffer')
    const pdfBuffer = Buffer.from(pdfBytes)
    
    console.log('Sample PDF generated successfully, buffer size:', pdfBuffer.length)
    return pdfBuffer
    
  } catch (error) {
    console.error('Error generating sample PDF:', error)
    throw new Error('Sample PDF generation failed')
  }
}

export async function GET(
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

    // Fetch the certificate template
    const { data: template, error: templateError } = await supabaseAdmin
      .from('certificate_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (templateError) {
      console.error('Error fetching template:', templateError)
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Debug: Log template data
    console.log('=== Template Debug Info ===')
    console.log('Template ID:', template.id)
    console.log('Template Title:', template.title)
    console.log('Background Design:', JSON.stringify(template.background_design, null, 2))
    console.log('Dynamic Fields Count:', template.dynamic_fields?.length || 0)
    console.log('Design Type:', template.background_design?.design_type)
    console.log('Certificate Background:', template.background_design?.certificate_background)
    console.log('==========================')

    // Check if this is a test request (for debugging)
    const { searchParams } = new URL(request.url)
    const debug = searchParams.get('debug')
    
    if (debug === 'true') {
      return NextResponse.json({
        template: {
          id: template.id,
          title: template.title,
          background_design: template.background_design,
          dynamic_fields: template.dynamic_fields,
          design_type: template.background_design?.design_type,
          certificate_background: template.background_design?.certificate_background
        }
      })
    }

    // Generate sample PDF
    const pdfBuffer = await generateSampleCertificatePDF(template)

    // Return the PDF as a downloadable file
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sample-${template.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error in sample certificate generation:', error)
    return NextResponse.json({ error: 'Failed to generate sample certificate' }, { status: 500 })
  }
} 