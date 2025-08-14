import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'

// Event Report PDF generation
async function generateEventReportPDF(event: any, attendanceData: any, stats: any): Promise<Buffer> {
  try {
    console.log('=== Event Report PDF Generation ===')
    console.log('Event:', event.title)
    console.log('Attendance records:', attendanceData.length)
    
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Get document dimensions
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let currentY = margin

    // Helper function to add new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (currentY + requiredHeight > pageHeight - margin) {
        doc.addPage()
        currentY = margin
        return true
      }
      return false
    }

    // Header with university branding
    doc.setFillColor(41, 128, 185) // Blue header
    doc.rect(0, 0, pageWidth, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Bukidnon State University', pageWidth / 2, 15, { align: 'center' })
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Student Management System', pageWidth / 2, 25, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text('Event Report', pageWidth / 2, 35, { align: 'center' })

    currentY = 60

    // Event Information Section
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Event Information', margin, currentY)
    currentY += 15

    // Event details box
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 50)
    
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    
    // Event title
    doc.setFont('helvetica', 'bold')
    doc.text('Event Title:', margin + 5, currentY + 5)
    doc.setFont('helvetica', 'normal')
    doc.text(event.title || 'N/A', margin + 35, currentY + 5)
    
    // Event date
    doc.setFont('helvetica', 'bold')
    doc.text('Date:', margin + 5, currentY + 15)
    doc.setFont('helvetica', 'normal')
    const eventDate = event.date ? format(new Date(event.date), 'MMMM dd, yyyy') : 'N/A'
    doc.text(eventDate, margin + 35, currentY + 15)
    
    // Time
    doc.setFont('helvetica', 'bold')
    doc.text('Time:', margin + 5, currentY + 25)
    doc.setFont('helvetica', 'normal')
    const timeText = `${event.start_time || '09:00'} - ${event.end_time || '17:00'}`
    doc.text(timeText, margin + 35, currentY + 25)
    
    // Location
    doc.setFont('helvetica', 'bold')
    doc.text('Location:', margin + 5, currentY + 35)
    doc.setFont('helvetica', 'normal')
    doc.text(event.location || 'TBD', margin + 35, currentY + 35)

    currentY += 70

    // Attendance Statistics Section
    checkPageBreak(100)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Attendance Statistics', margin, currentY)
    currentY += 20

    // Stats box with better spacing
    doc.setFillColor(248, 249, 250)
    doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 70, 'F')
    doc.rect(margin, currentY - 5, pageWidth - 2 * margin, 70)

    // Create stats grid with better spacing
    const statBoxWidth = (pageWidth - 2 * margin - 20) / 3
    const statBoxSpacing = 5
    
    // Total Eligible
    doc.setFillColor(52, 152, 219)
    doc.rect(margin + 5, currentY + 5, statBoxWidth, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Total Eligible', margin + 5 + statBoxWidth/2, currentY + 14, { align: 'center' })
    doc.setFontSize(16)
    doc.text(stats.total_eligible?.toString() || '0', margin + 5 + statBoxWidth/2, currentY + 24, { align: 'center' })

    // Attended
    doc.setFillColor(46, 204, 113)
    doc.rect(margin + 10 + statBoxWidth, currentY + 5, statBoxWidth, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Attended', margin + 10 + statBoxWidth + statBoxWidth/2, currentY + 14, { align: 'center' })
    doc.setFontSize(16)
    doc.text(stats.attended?.toString() || '0', margin + 10 + statBoxWidth + statBoxWidth/2, currentY + 24, { align: 'center' })

    // Attendance Rate
    doc.setFillColor(155, 89, 182)
    doc.rect(margin + 15 + 2 * statBoxWidth, currentY + 5, statBoxWidth, 25, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Attendance Rate', margin + 15 + 2 * statBoxWidth + statBoxWidth/2, currentY + 14, { align: 'center' })
    doc.setFontSize(16)
    doc.text(`${stats.percentage || 0}%`, margin + 15 + 2 * statBoxWidth + statBoxWidth/2, currentY + 24, { align: 'center' })

    currentY += 40

    // Event scope information with better spacing
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Event Scope:', margin + 5, currentY + 5)
    doc.setFont('helvetica', 'normal')
    let scopeText = stats.scope_type || 'UNIVERSITY_WIDE'
    if (stats.scope_details?.college) {
      scopeText += ` - ${stats.scope_details.college}`
    }
    if (stats.scope_details?.course) {
      scopeText += ` (${stats.scope_details.course})`
    }
    doc.text(scopeText, margin + 35, currentY + 5)

    currentY += 40

    // Attendance Records Section
    if (attendanceData && attendanceData.length > 0) {
      checkPageBreak(120)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Attendance Records', margin, currentY)
      currentY += 20

      // Calculate dynamic column widths based on content
      const headers = ['#', 'Student ID', 'Full Name', 'College', 'Status']
      const availableWidth = pageWidth - 2 * margin - 6 // Account for padding
      
      // Analyze content to determine optimal column widths
      const maxContentLengths = [0, 0, 0, 0, 0]
      
      // Check header lengths
      headers.forEach((header, i) => {
        maxContentLengths[i] = Math.max(maxContentLengths[i], header.length)
      })
      
      // Check data lengths
      attendanceData.forEach((record: any) => {
        const rowData = [
          (attendanceData.indexOf(record) + 1).toString(),
          record.student?.student_id || 'N/A',
          record.student?.name || 'N/A',
          record.student?.college || 'N/A',
          record.time_in && record.time_out ? 'Present' : 'Incomplete'
        ]
        
        rowData.forEach((data, i) => {
          maxContentLengths[i] = Math.max(maxContentLengths[i], data.length)
        })
      })
      
      // Calculate proportional widths with minimum constraints
      const minWidths = [10, 25, 40, 30, 20] // Minimum widths in mm
      const baseWidths = maxContentLengths.map((length, i) => Math.max(length * 2.5, minWidths[i]))
      const totalBaseWidth = baseWidths.reduce((sum, width) => sum + width, 0)
      
      // Scale to fit available width while respecting content needs
      const colWidths = baseWidths.map(width => 
        Math.max(minWidths[baseWidths.indexOf(width)], (width / totalBaseWidth) * availableWidth)
      )
      
      // Draw header row
      doc.setFillColor(52, 73, 94)
      doc.rect(margin, currentY, availableWidth, 12, 'F')
      
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      
      let currentX = margin + 3
      headers.forEach((header, index) => {
        doc.text(header, currentX, currentY + 8)
        currentX += colWidths[index]
      })
      
      currentY += 12

      // Helper function to wrap text within a given width
      const wrapText = (text: string, maxWidth: number, fontSize: number = 9) => {
        doc.setFontSize(fontSize)
        const words = text.split(' ')
        const lines: string[] = []
        let currentLine = ''
        
        words.forEach(word => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word
          const textWidth = doc.getTextWidth(testLine)
          
          if (textWidth < maxWidth - 4) { // Account for padding
            currentLine = testLine
          } else {
            if (currentLine) {
              lines.push(currentLine)
              currentLine = word
            } else {
              // Word is too long, split it
              lines.push(word)
            }
          }
        })
        
        if (currentLine) {
          lines.push(currentLine)
        }
        
        return lines
      }

      // Table rows with improved text wrapping
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'normal')
      
      attendanceData.forEach((record: any, index: number) => {
        // Calculate row height based on content
        const rowData = [
          (index + 1).toString(),
          record.student?.student_id || 'N/A',
          record.student?.name || 'N/A',
          record.student?.college || 'N/A',
          record.time_in && record.time_out ? 'Present' : 'Incomplete'
        ]
        
        // Find maximum lines needed for this row
        let maxLines = 1
        rowData.forEach((data, i) => {
          if (i >= 2) { // Only wrap text for Name, College, and Status columns
            const lines = wrapText(data, colWidths[i])
            maxLines = Math.max(maxLines, lines.length)
          }
        })
        
        const rowHeight = Math.max(10, maxLines * 4 + 4) // Dynamic row height
        
        if (checkPageBreak(rowHeight + 5)) {
          // Add some space before redrawing headers on new page
          currentY += 10
          
          // Redraw headers on new page
          doc.setFillColor(52, 73, 94)
          doc.rect(margin, currentY, availableWidth, 12, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          
          let headerX = margin + 3
          headers.forEach((header, i) => {
            doc.text(header, headerX, currentY + 8)
            headerX += colWidths[i]
          })
          
          currentY += 12
          doc.setTextColor(0, 0, 0)
          doc.setFont('helvetica', 'normal')
        }

        // Alternate row colors
        if (index % 2 === 0) {
          doc.setFillColor(248, 249, 250)
          doc.rect(margin, currentY, availableWidth, rowHeight, 'F')
        }

        let rowX = margin + 3
        doc.setFontSize(9)
        
        rowData.forEach((data, i) => {
          if (i <= 1) {
            // For # and Student ID columns, use simple text
            doc.text(data, rowX, currentY + 6.5)
          } else {
            // For Name, College, and Status columns, use text wrapping
            const lines = wrapText(data, colWidths[i])
            lines.forEach((line, lineIndex) => {
              doc.text(line, rowX, currentY + 6.5 + (lineIndex * 4))
            })
          }
          
          rowX += colWidths[i]
        })

        currentY += rowHeight
      })
      
      // Add some space after the table
      currentY += 10
    }

    // Footer - ensure it doesn't overlap with content
    const footerY = Math.max(currentY + 20, pageHeight - 30)
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, footerY, pageWidth - margin, footerY)
    
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text('Generated by Student Management System', margin, footerY + 10)
    doc.text(`Report generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}`, pageWidth - margin, footerY + 10, { align: 'right' })
    doc.text(`Event ID: ${event.id}`, margin, footerY + 18)

    // Convert to buffer
    const pdfBytes = doc.output('arraybuffer')
    const pdfBuffer = Buffer.from(pdfBytes)
    
    console.log('Event report PDF generated successfully, buffer size:', pdfBuffer.length)
    return pdfBuffer
    
  } catch (error) {
    console.error('Error generating event report PDF:', error)
    throw new Error(`Event report PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

    const { id } = await params

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (eventError) {
      console.error('Error fetching event:', eventError)
      return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
    }

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Get attendance records with student details
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from('attendance')
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
        )
      `)
      .eq('event_id', id)
      .order('created_at', { ascending: true })

    if (attendanceError) {
      console.error('Error fetching attendance records:', attendanceError)
      return NextResponse.json({ error: 'Failed to fetch attendance records' }, { status: 500 })
    }

    // Get event statistics
    const { data: statsResponse, error: statsError } = await fetch(
      `${request.url.replace('/report', '/stats')}`,
      { headers: { cookie: request.headers.get('cookie') || '' } }
    ).then(res => res.json()).catch(() => null)

    // Fallback stats calculation if API call fails
    let stats = statsResponse || {
      total_eligible: 0,
      attended: attendanceRecords?.filter(r => r.time_in && r.time_out).length || 0,
      percentage: 0,
      scope_type: event.scope_type || 'UNIVERSITY_WIDE',
      scope_details: {
        college: event.scope_college,
        course: event.scope_course
      }
    }

    // Generate PDF
    const pdfBuffer = await generateEventReportPDF(event, attendanceRecords || [], stats)

    // Set response headers
    const filename = `event-report-${event.title.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error in GET /api/events/[id]/report:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
