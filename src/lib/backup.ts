import { promises as fs } from "fs"
import { createWriteStream } from "fs"
import path from "path"
import os from "os"
import archiver from "archiver"
import AdmZip from "adm-zip"
import { Pool } from "pg"

const BACKUP_DIR = process.env.BACKUP_STORAGE_DIR
  ? path.resolve(process.env.BACKUP_STORAGE_DIR)
  : path.join(process.cwd(), "backups")

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads")
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 90)

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
})

let backupInProgress = false
let restoreInProgress = false

export class BackupInProgressError extends Error {
  constructor(message = "A backup operation is already running.") {
    super(message)
    this.name = "BackupInProgressError"
  }
}

export class RestoreInProgressError extends Error {
  constructor(message = "A restore operation is already running.") {
    super(message)
    this.name = "RestoreInProgressError"
  }
}

export interface BackupInfo {
  name: string
  createdAt: string
  sizeBytes: number
  sizeHuman: string
  path: string
  metadata?: BackupMetadata | null
}

export interface BackupSummary {
  total: number
  lastBackupAt: string | null
  nextScheduledBackupAt: string
}

export interface CreateBackupOptions {
  triggeredBy: "manual" | "automatic"
  requestedBy?: {
    id: string | null
    name: string | null
  }
}

export interface CreateBackupResult {
  backup: BackupInfo & {
    metadata: BackupMetadata
  }
  deleted: BackupInfo[]
}

export interface BackupMetadata {
  version: number
  createdAt: string
  triggeredBy: "manual" | "automatic"
  requestedBy: {
    id: string | null
    name: string | null
  }
  tableCounts: Record<string, number>
}

interface DatabaseDump {
  exportedAt: string
  tables: Array<{
    name: string
    rowCount: number
    rows: Record<string, unknown>[]
  }>
}

export interface RestoreOptions {
  backupName: string
  requestedBy?: {
    id: string | null
    name: string | null
  }
}

export interface RestoreResult {
  backup: BackupInfo & { metadata: BackupMetadata | null }
}

export const isBackupRunning = () => backupInProgress
export const isRestoreRunning = () => restoreInProgress

export async function ensureBackupDirectory() {
  await fs.mkdir(BACKUP_DIR, { recursive: true })
}

function formatTimestamp(date: Date) {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const hh = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  const ss = String(date.getSeconds()).padStart(2, "0")
  return `${yyyy}_${mm}_${dd}_${hh}${min}${ss}`
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B"
  const units = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / Math.pow(1024, index)
  return `${value.toFixed(2)} ${units[index]}`
}

async function pathExists(target: string) {
  try {
    await fs.access(target)
    return true
  } catch {
    return false
  }
}

async function cleanupOldBackups(): Promise<BackupInfo[]> {
  await ensureBackupDirectory()
  const entries = await fs.readdir(BACKUP_DIR)
  const now = Date.now()
  const threshold = now - RETENTION_DAYS * 24 * 60 * 60 * 1000
  const removed: BackupInfo[] = []

  await Promise.all(
    entries.map(async (entry) => {
      if (!entry.endsWith(".zip")) return
      const filePath = path.join(BACKUP_DIR, entry)
      const stat = await fs.stat(filePath)
      if (stat.mtime.getTime() < threshold) {
        await fs.rm(filePath, { force: true })
        removed.push({
          name: entry,
          createdAt: stat.mtime.toISOString(),
          sizeBytes: stat.size,
          sizeHuman: formatFileSize(stat.size),
          path: filePath,
        })
      }
    }),
  )

  return removed
}

async function serializeDatabase(): Promise<{
  dump: DatabaseDump
  tableCounts: Record<string, number>
}> {
  const client = await pool.connect()

  try {
    const { rows: tableRows } = await client.query<{
      table_name: string
    }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `)

    const tables: DatabaseDump["tables"] = []
    const tableCounts: Record<string, number> = {}

    for (const { table_name } of tableRows) {
      const { rows } = await client.query<Record<string, unknown>>(
        `SELECT * FROM "${table_name}"`,
      )

      const serializedRows = rows.map((row) => serializeRow(row))
      tables.push({
        name: table_name,
        rowCount: serializedRows.length,
        rows: serializedRows,
      })
      tableCounts[table_name] = serializedRows.length
    }

    return {
      dump: {
        exportedAt: new Date().toISOString(),
        tables,
      },
      tableCounts,
    }
  } finally {
    client.release()
  }
}

function serializeRow(row: Record<string, unknown>) {
  const serialized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(row)) {
    if (value instanceof Date) {
      serialized[key] = value.toISOString()
    } else if (Buffer.isBuffer(value)) {
      serialized[key] = {
        __backupType: "buffer",
        value: value.toString("base64"),
      }
    } else {
      serialized[key] = value
    }
  }

  return serialized
}

function deserializeRow(row: Record<string, unknown>) {
  const deserialized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(row)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      "__backupType" in value
    ) {
      const typedValue = value as { __backupType: string; value: string }
      if (typedValue.__backupType === "buffer") {
        deserialized[key] = Buffer.from(typedValue.value, "base64")
      } else {
        deserialized[key] = typedValue.value
      }
    } else {
      deserialized[key] = value
    }
  }

  return deserialized
}

export async function listBackups(): Promise<BackupInfo[]> {
  await ensureBackupDirectory()
  const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true })

  const backups: BackupInfo[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".zip")) continue
    const filePath = path.join(BACKUP_DIR, entry.name)
    const stat = await fs.stat(filePath)
    const metadata = await readBackupMetadata(filePath)
    backups.push({
      name: entry.name,
      createdAt: stat.mtime.toISOString(),
      sizeBytes: stat.size,
      sizeHuman: formatFileSize(stat.size),
      path: filePath,
      metadata,
    })
  }

  return backups.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
}

export async function getBackupSummary(): Promise<BackupSummary> {
  const backups = await listBackups()
  const lastBackup = backups[0] ?? null
  const nextScheduled = getNextScheduledBackupDate()

  return {
    total: backups.length,
    lastBackupAt: lastBackup ? lastBackup.createdAt : null,
    nextScheduledBackupAt: nextScheduled.toISOString(),
  }
}

function getNextScheduledBackupDate() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return next
}

export async function createBackup(
  options: CreateBackupOptions,
): Promise<CreateBackupResult> {
  if (backupInProgress) {
    throw new BackupInProgressError()
  }

  backupInProgress = true

  try {
    await ensureBackupDirectory()

    const timestamp = formatTimestamp(new Date())
    const backupName = `backup_${timestamp}.zip`
    const backupPath = path.join(BACKUP_DIR, backupName)

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "backup-"))

    let metadata: BackupMetadata

    try {
      const { dump, tableCounts } = await serializeDatabase()
      const dumpPath = path.join(tempDir, "database.json")
      await fs.writeFile(dumpPath, JSON.stringify(dump, null, 2), "utf-8")

      metadata = {
        version: 1,
        createdAt: new Date().toISOString(),
        triggeredBy: options.triggeredBy,
        requestedBy: {
          id: options.requestedBy?.id ?? null,
          name: options.requestedBy?.name ?? null,
        },
        tableCounts,
      }

      const metadataPath = path.join(tempDir, "metadata.json")
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), "utf-8")

      await new Promise<void>((resolve, reject) => {
        const output = createWriteStream(backupPath)
        const archive = archiver("zip", { zlib: { level: 9 } })

        output.on("close", () => resolve())
        output.on("error", reject)
        archive.on("error", reject)

        archive.pipe(output)
        archive.file(dumpPath, { name: "database.json" })
        archive.file(metadataPath, { name: "metadata.json" })

        ;(async () => {
          if (await pathExists(UPLOADS_DIR)) {
            archive.directory(UPLOADS_DIR, "uploads")
          }
          await archive.finalize()
        })().catch(reject)
      })
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true })
    }

    const stat = await fs.stat(backupPath)

    const deleted = await cleanupOldBackups()

    return {
      backup: {
        name: backupName,
        createdAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
        sizeHuman: formatFileSize(stat.size),
        path: backupPath,
        metadata,
      },
      deleted,
    }
  } finally {
    backupInProgress = false
  }
}

async function readBackupMetadata(
  backupPath: string,
): Promise<BackupMetadata | null> {
  try {
    const zip = new AdmZip(backupPath)
    const metadataEntry = zip.getEntry("metadata.json")
    if (!metadataEntry) {
      return null
    }
    const content = metadataEntry.getData().toString("utf-8")
    return JSON.parse(content) as BackupMetadata
  } catch (error) {
    console.warn("Failed to read backup metadata:", error)
    return null
  }
}

export async function restoreBackup(
  options: RestoreOptions,
): Promise<RestoreResult> {
  if (restoreInProgress) {
    throw new RestoreInProgressError()
  }
  if (backupInProgress) {
    throw new BackupInProgressError(
      "Cannot restore while a backup operation is running.",
    )
  }

  restoreInProgress = true

  try {
    const backupPath = path.join(BACKUP_DIR, options.backupName)
    if (!(await pathExists(backupPath))) {
      throw new Error(`Backup ${options.backupName} does not exist`)
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "restore-"))
    try {
      const zip = new AdmZip(backupPath)
      zip.extractAllTo(tempDir, true)

      const databaseJsonPath = path.join(tempDir, "database.json")
      const metadata = await readBackupMetadata(backupPath)

      if (!(await pathExists(databaseJsonPath))) {
        throw new Error("Backup is missing database.json")
      }

      const databaseRaw = await fs.readFile(databaseJsonPath, "utf-8")
      const dump = JSON.parse(databaseRaw) as DatabaseDump
      await restoreDatabase(dump)

      const uploadsSource = path.join(tempDir, "uploads")
      if (await pathExists(uploadsSource)) {
        await fs.rm(UPLOADS_DIR, { recursive: true, force: true })
        await fs.mkdir(UPLOADS_DIR, { recursive: true })
        await fs.cp(uploadsSource, UPLOADS_DIR, { recursive: true })
      }

      const stat = await fs.stat(backupPath)

      return {
        backup: {
          name: options.backupName,
          createdAt: stat.mtime.toISOString(),
          sizeBytes: stat.size,
          sizeHuman: formatFileSize(stat.size),
          path: backupPath,
          metadata,
        },
      }
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true })
    }
  } finally {
    restoreInProgress = false
  }
}

async function restoreDatabase(dump: DatabaseDump) {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const tableNames = dump.tables.map((table) => `"${table.name}"`)

    if (tableNames.length > 0) {
      await client.query(
        `TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY CASCADE`,
      )
    }

    for (const table of dump.tables) {
      if (!table.rows || table.rows.length === 0) continue

      for (const row of table.rows) {
        const deserialized = deserializeRow(row)
        const columns = Object.keys(deserialized)
        const values = columns.map((column) => deserialized[column])
        const placeholders = columns.map((_, idx) => `$${idx + 1}`)

        const query = `INSERT INTO "${table.name}" (${columns
          .map((col) => `"${col}"`)
          .join(", ")}) VALUES (${placeholders.join(", ")})`

        await client.query(query, values)
      }
    }

    await client.query("COMMIT")
  } catch (error) {
    await client.query("ROLLBACK")
    throw error
  } finally {
    client.release()
  }
}


