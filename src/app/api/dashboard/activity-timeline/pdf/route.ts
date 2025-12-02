import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { jsPDF } from "jspdf"
import { format } from "date-fns"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!["ADMIN", "COLLEGE_ORG", "COURSE_ORG"].includes(session.user.role as any)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch latest system activities (same source as dashboard stats)
    const { data: activities, error } = await supabaseAdmin
      .from("notifications")
      .select("created_at, message, type")
      .eq("type", "SYSTEM_ACTIVITY")
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("Error fetching activities for PDF:", error)
      return NextResponse.json(
        { error: "Failed to load activity data" },
        { status: 500 }
      )
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    const adminName =
      (session.user as any)?.name || (session.user as any)?.email || "Administrator"

    // Header - match style of fee report
    doc.setFillColor(41, 128, 185)
    doc.rect(0, 0, pageWidth, 40, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(18)
    doc.text("Activity Timeline", pageWidth / 2, 16, { align: "center" })
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(format(new Date(), "MMMM dd, yyyy HH:mm"), pageWidth / 2, 25, {
      align: "center",
    })

    let y = margin + 30

    // Summary section
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(16)
    doc.text("Summary", margin, y)
    y += 8
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10

    const summaryX = margin
    const tableWidth = pageWidth - margin * 2
    const labelWidth = tableWidth * 0.7

    const summaryRow = (label: string, value: string) => {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      doc.setDrawColor(235, 238, 240)
      doc.rect(summaryX, y - 6, tableWidth, 9, "S")
      doc.text(label, summaryX + 3, y)
      doc.text(value, summaryX + labelWidth, y, { align: "right" })
      y += 9
    }

    const totalActivities = activities?.length || 0
    const today = new Date()
    const last7 = activities?.filter((a: any) => {
      const d = new Date(a.created_at)
      const diff = (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
      return diff <= 7
    }).length

    summaryRow("Total system activities", String(totalActivities))
    summaryRow("Activities in the last 7 days", String(last7 || 0))

    y += 10

    // Activity table header
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14)
    doc.text("Recent Activity Log", margin, y)
    y += 8
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 10

    const colDateWidth = tableWidth * 0.32
    const colMessageWidth = tableWidth - colDateWidth

    const drawHeader = () => {
      doc.setFillColor(52, 73, 94)
      doc.setDrawColor(52, 73, 94)
      doc.rect(summaryX, y - 6, tableWidth, 12, "F")
      doc.setFont("helvetica", "bold")
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      doc.text("Date & Time", summaryX + 3, y + 2)
      doc.text("Activity", summaryX + colDateWidth + 3, y + 2)
      y += 12
      doc.setTextColor(0, 0, 0)
    }

    const checkPageBreak = (required: number) => {
      if (y + required > pageHeight - margin - 12) {
        doc.addPage()
        y = margin
        drawHeader()
      }
    }

    drawHeader()

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)

    const wrapText = (text: string, maxWidth: number) => {
      return doc.splitTextToSize(text, maxWidth - 6)
    }

    ;(activities || []).forEach((a: any) => {
      const dateStr = format(new Date(a.created_at), "yyyy-MM-dd HH:mm")
      const messageLines = wrapText(a.message || "—", colMessageWidth)
      const lineCount = Math.max(1, messageLines.length)
      const rowHeight = lineCount * 4 + 4

      checkPageBreak(rowHeight + 4)

      doc.setDrawColor(235, 238, 240)
      doc.rect(summaryX, y - 6, tableWidth, rowHeight, "S")

      // Date column
      doc.text(dateStr, summaryX + 3, y)

      // Message column
      messageLines.forEach((line: string, idx: number) => {
        doc.text(line, summaryX + colDateWidth + 3, y + idx * 4)
      })

      y += rowHeight
    })

    // Footer like fee report
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const footerY = pageHeight - 10
      doc.setDrawColor(220, 225, 230)
      doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated by: ${adminName}`, margin, footerY)
      doc.text(format(new Date(), "MMM dd, yyyy HH:mm"), pageWidth - margin, footerY, {
        align: "right",
      })
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, footerY, { align: "center" })
    }

    const pdfBytes = doc.output("arraybuffer")
    const pdfBuffer = Buffer.from(pdfBytes)
    const fileName = `activity-timeline-${format(new Date(), "yyyy-MM-dd")}.pdf`

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Error generating activity timeline PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate activity timeline PDF" },
      { status: 500 }
    )
  }
}


