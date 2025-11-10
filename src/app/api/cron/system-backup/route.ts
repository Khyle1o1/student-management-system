import { NextRequest, NextResponse } from "next/server"
import { BackupInProgressError, createBackup } from "@/lib/backup"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await createBackup({
      triggeredBy: "automatic",
      requestedBy: {
        id: null,
        name: "System Cron",
      },
    })

    try {
      await supabaseAdmin.from("notifications").insert({
        user_id: null,
        type: "SYSTEM_ACTIVITY",
        title: "Automatic backup completed",
        message: `Monthly backup completed successfully.`,
        data: {
          backupName: result.backup.name,
          sizeBytes: result.backup.sizeBytes,
          sizeHuman: result.backup.sizeHuman,
          triggeredBy: "automatic",
        },
        is_read: true,
        created_at: new Date().toISOString(),
      })
    } catch (logError) {
      console.warn("Failed to log automatic backup activity:", logError)
    }

    return NextResponse.json({
      message: "Automatic backup completed",
      backup: result.backup,
      deleted: result.deleted,
    })
  } catch (error) {
    if (error instanceof BackupInProgressError) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 },
      )
    }

    console.error("Automatic backup failed:", error)
    return NextResponse.json(
      { error: "Automatic backup failed" },
      { status: 500 },
    )
  }
}


