import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import {
  buildRespondentProfiles,
  buildResponsesPayload,
  FormDataShape,
  RespondentProfile,
} from './utils/form-sample-utils'

type CliArgs = {
  formId?: string
  eventId?: string
  eventTitle: string
  attendees: number
  responses: number
  students: number
  dryRun: boolean
}

type SupabaseEvent = {
  id: string
}

type SupabaseStudent = {
  id: string
  student_id: string
  name: string
  email: string
  college: string
  course: string
  year_level: number
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
})

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const argMap: Record<string, string | boolean> = {}

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [rawKey, rawValue] = arg.slice(2).split('=')
      argMap[rawKey] = rawValue ?? true
    }
  }

  const formId = (argMap.form as string) || (argMap.formId as string) || undefined
  const eventId = (argMap.event as string) || (argMap.eventId as string) || undefined
  const eventTitle =
    (argMap.title as string) ||
    (argMap.name as string) ||
    `Dummy Mega Event ${new Date().toISOString().split('T')[0]}`

  const attendees = Number(
    argMap.attendees ??
      argMap.attendee ??
      argMap['attendance-count'] ??
      process.env.DUMMY_ATTENDEE_COUNT ??
      500,
  )

  const responses = Number(
    argMap.responses ??
      argMap['response-count'] ??
      process.env.DUMMY_RESPONSE_COUNT ??
      attendees,
  )

  const students = Number(
    argMap.students ??
      argMap['student-count'] ??
      process.env.DUMMY_STUDENT_COUNT ??
      Math.max(attendees, responses),
  )

  if (Number.isNaN(attendees) || attendees <= 0) {
    console.error('❌ Invalid --attendees value. Provide a positive number.')
    process.exit(1)
  }

  if (Number.isNaN(responses) || responses <= 0) {
    console.error('❌ Invalid --responses value. Provide a positive number.')
    process.exit(1)
  }

  if (Number.isNaN(students) || students <= 0) {
    console.error('❌ Invalid --students value. Provide a positive number.')
    process.exit(1)
  }

  const dryRun = Boolean(argMap['dry-run'] ?? argMap.dry ?? process.env.DRY_RUN === 'true')

  return {
    formId,
    eventId,
    eventTitle,
    attendees,
    responses,
    students,
    dryRun,
  }
}

async function fetchFormDefinition(formId: string): Promise<FormDataShape> {
  const { data, error } = await supabase
    .from('evaluation_forms')
    .select('id, title, description, questions, settings, status')
    .eq('id', formId)
    .single()

  if (error || !data) {
    throw new Error(`Failed to fetch evaluation form ${formId}: ${error?.message ?? 'not found'}`)
  }

  if (data.status && data.status !== 'PUBLISHED') {
    throw new Error(`Form "${data.title}" is not published (status: ${data.status}). Publish it before seeding.`)
  }

  // Questions might be stored as JSON objects; ensure we have arrays for options
  data.questions = (data.questions ?? []).map((question: any) => {
    const normalizedOptions =
      question.options && !Array.isArray(question.options)
        ? Object.values(question.options as Record<string, string>)
        : question.options
    return {
      ...question,
      options: normalizedOptions,
    }
  })

  return data as FormDataShape
}

async function ensureStudentPool(target: number, dryRun: boolean): Promise<SupabaseStudent[]> {
  const existingStudents: SupabaseStudent[] = []
  let page = 0
  const pageSize = 1000

  while (existingStudents.length < target) {
    const { data, error, count } = await supabase
      .from('students')
      .select('id, student_id, name, email, college, course, year_level', { count: 'exact' })
      .range(page * pageSize, page * pageSize + pageSize - 1)

    if (error) {
      throw new Error(`Failed to fetch students: ${error.message}`)
    }

    if (!data || data.length === 0) {
      break
    }

    existingStudents.push(...(data as SupabaseStudent[]))

    if ((count ?? 0) <= existingStudents.length) {
      break
    }

    page += 1
  }

  if (existingStudents.length >= target || dryRun) {
    return existingStudents.slice(0, target)
  }

  const studentsToCreate = target - existingStudents.length
  console.log(`👥 Existing students: ${existingStudents.length}. Creating ${studentsToCreate} more...`)

  const colleges = [
    { college: 'Engineering', course: 'Computer Science' },
    { college: 'Business', course: 'Accountancy' },
    { college: 'Education', course: 'Secondary Education' },
    { college: 'Arts & Sciences', course: 'Psychology' },
    { college: 'Nursing', course: 'Nursing' },
    { college: 'Agriculture', course: 'Agribusiness' },
    { college: 'Engineering', course: 'Electronics Engineering' },
  ]

  const batches = chunk(Array.from({ length: studentsToCreate }).map((_, index) => index), 200)
  const createdStudents: SupabaseStudent[] = []

  for (const batch of batches) {
    const usersPayload = batch.map((offset) => {
      const globalIndex = existingStudents.length + createdStudents.length + offset
      const profile = buildRespondentProfiles(batch.length)[offset]
      const hashedPassword = bcrypt.hashSync('Password123!', 10)

      return {
        email: `dummy.student.${globalIndex}@sampleforms.test`,
        password: hashedPassword,
        name: profile.name,
        role: 'STUDENT',
        created_at: new Date().toISOString(),
      }
    })

    const { data: users, error: usersError } = await supabase
      .from('users')
      .insert(usersPayload)
      .select('id, email, name')

    if (usersError || !users) {
      throw new Error(`Failed to create users: ${usersError?.message}`)
    }

    const studentsPayload = users.map((user, idx) => {
      const profile = buildRespondentProfiles(users.length)[idx]
      const collegeInfo = colleges[(existingStudents.length + createdStudents.length + idx) % colleges.length]

      return {
        user_id: user.id,
        student_id: `DUMMY-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        name: user.name ?? profile.name,
        email: user.email,
        phone: profile.phone,
        college: collegeInfo.college,
        course: collegeInfo.course,
        year_level: ((existingStudents.length + createdStudents.length + idx) % 4) + 1,
        created_at: new Date().toISOString(),
      }
    })

    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .insert(studentsPayload)
      .select('id, student_id, name, email, college, course, year_level')

    if (studentsError || !studentsData) {
      throw new Error(`Failed to create students: ${studentsError?.message}`)
    }

    createdStudents.push(...(studentsData as SupabaseStudent[]))
    console.log(`   ➕ Created batch of ${studentsData.length} students`)
  }

  return [...existingStudents, ...createdStudents].slice(0, target)
}

async function ensureEvent(
  args: CliArgs,
  formId: string | undefined,
  dryRun: boolean,
): Promise<SupabaseEvent> {
  if (args.eventId) {
    console.log(`📌 Using existing event: ${args.eventId}`)
    return { id: args.eventId }
  }

  if (dryRun) {
    console.log('📌 Dry run: skipping event creation.')
    return { id: 'dry-run-event-id' }
  }

  const eventDate = new Date()
  eventDate.setDate(eventDate.getDate() - 7)

  const payload = {
    title: args.eventTitle,
    description: 'Automatically generated dummy event for load-testing statistics.',
    date: eventDate.toISOString().split('T')[0],
    start_time: '08:30',
    end_time: '17:00',
    location: 'University Convention Center',
    type: 'SEMINAR',
    status: 'APPROVED',
    scope_type: 'UNIVERSITY_WIDE',
    scope_college: null,
    scope_course: null,
    attendance_type: 'IN_OUT',
    require_evaluation: Boolean(formId),
    evaluation_id: formId ?? null,
  }

  const { data, error } = await supabase.from('events').insert([payload]).select('id').single()

  if (error || !data) {
    throw new Error(`Failed to create dummy event: ${error?.message}`)
  }

  console.log(`📆 Created dummy event "${args.eventTitle}" with ID ${data.id}`)
  return data as SupabaseEvent
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

function buildAttendancePayload(
  eventId: string,
  students: SupabaseStudent[],
  count: number,
): any[] {
  const attendance: any[] = []
  const eventDate = new Date()
  eventDate.setHours(8, 0, 0, 0)

  for (let i = 0; i < count; i++) {
    const student = students[i % students.length]
    const statusRoll = Math.random()
    const isPresent = statusRoll < 0.85
    const isLate = !isPresent && statusRoll < 0.93
    const status = isPresent ? 'PRESENT' : isLate ? 'LATE' : 'ABSENT'

    const timeIn = isPresent || isLate ? new Date(eventDate.getTime() + Math.random() * 60 * 60 * 1000) : null
    const timeOut =
      status === 'PRESENT'
        ? new Date(eventDate.getTime() + 8 * 60 * 60 * 1000 + Math.random() * 60 * 60 * 1000)
        : null

    attendance.push({
      event_id: eventId,
      student_id: student.id,
      status,
      time_in: timeIn ? timeIn.toISOString() : null,
      time_out: timeOut ? timeOut.toISOString() : null,
      mode: timeIn ? 'SIGN_IN' : null,
      certificate_generated: false,
      created_at: new Date().toISOString(),
    })
  }

  return attendance
}

function buildResponseRows(
  form: FormDataShape,
  profiles: RespondentProfile[],
  studentPool: SupabaseStudent[],
  eventId: string,
  responses: number,
) {
  const payload = buildResponsesPayload(form, profiles, responses)
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - 10)

  return payload.map(({ profile, answers }, index) => {
    const student = studentPool[index % studentPool.length]
    const submittedAt = new Date(baseDate.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000)

    return {
      form_id: form.id,
      respondent_name: profile.name,
      respondent_email: profile.email,
      answers,
      submitted_at: submittedAt.toISOString(),
      event_id: eventId,
      student_id: student.id,
      ip_address: null,
      user_agent: 'DummyDataSeeder/1.0',
    }
  })
}

async function insertInBatches(table: string, rows: any[], dryRun: boolean, batchSize = 500) {
  if (dryRun) {
    console.log(`🛈 Dry run: skipping insert of ${rows.length} rows into ${table}`)
    return
  }

  const batches = chunk(rows, batchSize)
  for (const [index, batch] of batches.entries()) {
    const { error } = await supabase.from(table).insert(batch)
    if (error) {
      throw new Error(`Failed to insert into ${table} (batch ${index + 1}/${batches.length}): ${error.message}`)
    }
    console.log(`   ➕ Inserted batch ${index + 1}/${batches.length} into ${table}`)
  }
}

async function main() {
  const args = parseArgs()

  console.log('==============================================')
  console.log('🏗️  Dummy Event Seeder (attendance + form responses)')
  console.log('==============================================')
  console.log(`🎯 Event target attendees: ${args.attendees}`)
  console.log(`📝 Response target count: ${args.responses}`)
  console.log(`👥 Student pool target: ${args.students}`)
  console.log(`📄 Evaluation form: ${args.formId ?? 'none (optional)'}`)
  console.log(`🧪 Dry run: ${args.dryRun ? 'Yes' : 'No'}`)
  console.log('----------------------------------------------')

  try {
    const form = args.formId ? await fetchFormDefinition(args.formId) : undefined
    if (form) {
      console.log(`✅ Loaded form "${form.title}" with ${form.questions.length} questions`)
    }

    const studentPool = await ensureStudentPool(args.students, args.dryRun)
    console.log(`👥 Student pool ready (${studentPool.length} records available)`)

    const event = await ensureEvent(args, form?.id, args.dryRun)

    const attendanceRows = buildAttendancePayload(event.id, studentPool, args.attendees)
    console.log(`🗳️  Prepared ${attendanceRows.length} attendance rows`)
    await insertInBatches('attendance', attendanceRows, args.dryRun)

    if (form) {
      const profiles = buildRespondentProfiles(Math.max(args.responses, 50))
      const responseRows = buildResponseRows(form, profiles, studentPool, event.id, args.responses)
      console.log(`📨 Prepared ${responseRows.length} form responses`)
      await insertInBatches('form_responses', responseRows, args.dryRun)
    } else {
      console.log('ℹ️  No form ID provided, skipping response seeding.')
    }

    console.log('----------------------------------------------')
    console.log('✅ Dummy event seeding complete!')
    console.log(`   • Event ID: ${event.id}`)
    console.log(`   • Attendance rows: ${attendanceRows.length}`)
    console.log(`   • Form responses: ${form ? args.responses : 0}`)
    if (args.dryRun) {
      console.log('ℹ️  Dry run mode: no data was written. Remove --dry-run to apply changes.')
    } else {
      console.log('📊 Visit the attendance dashboard and form statistics to review the generated data.')
    }
  } catch (error) {
    console.error('❌ Seeder failed:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

void main()

