import 'dotenv/config'
import {
  buildRespondentProfiles,
  buildResponsesPayload,
  FormDataShape,
} from './utils/form-sample-utils'

type CliArgs = {
  formId: string
  count: number
  baseUrl: string
  dryRun: boolean
  delayMs: number
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2)
  const argMap: Record<string, string | boolean> = {}

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      argMap[key] = value ?? true
    }
  }

  const formId =
    (argMap.form as string) ||
    (argMap.formId as string) ||
    process.env.FORM_ID ||
    process.env.FORM_UUID ||
    ''

  if (!formId) {
    console.error('❌ Missing form ID. Pass --form=<uuid> or set FORM_ID environment variable.')
    process.exit(1)
  }

  const count =
    argMap.count !== undefined
      ? Number(argMap.count)
      : process.env.RESPONSE_COUNT
      ? Number(process.env.RESPONSE_COUNT)
      : 25

  if (!Number.isFinite(count) || count <= 0) {
    console.error('❌ Invalid --count value. Please provide a positive number.')
    process.exit(1)
  }

  const baseUrl =
    (argMap.base as string) ||
    (argMap.baseUrl as string) ||
    process.env.FORMS_API_BASE ||
    'http://localhost:3000'

  const dryRun = Boolean(argMap['dry-run'] ?? argMap.dry ?? process.env.DRY_RUN === 'true')
  const delayMsRaw =
    argMap.delay !== undefined
      ? Number(argMap.delay)
      : argMap['delay-ms'] !== undefined
      ? Number(argMap['delay-ms'])
      : process.env.SEED_DELAY_MS
      ? Number(process.env.SEED_DELAY_MS)
      : 120

  const delayMs = Number.isFinite(delayMsRaw) && delayMsRaw >= 0 ? delayMsRaw : 120

  return {
    formId,
    count,
    baseUrl: baseUrl.replace(/\/$/, ''),
    dryRun,
    delayMs,
  }
}

async function fetchForm(baseUrl: string, formId: string): Promise<FormDataShape> {
  const response = await fetch(`${baseUrl}/api/forms/${formId}`, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'FormSeedScript/1.1',
    },
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Failed to fetch form (${response.status}): ${message}`)
  }

  const data = (await response.json()) as FormDataShape

  if (data.status && data.status !== 'PUBLISHED') {
    throw new Error(`Form status is "${data.status}". Only published forms accept responses.`)
  }

  if (data.settings?.require_login) {
    throw new Error('This form requires login. Please disable "require login" or seed manually via the UI.')
  }

  // Ensure options arrays are normalized
  data.questions = data.questions.map((question) => {
    let normalizedOptions: string[] | undefined

    if (Array.isArray(question.options)) {
      normalizedOptions = (question.options as any[]).map((option) => String(option))
    } else if (question.options && typeof question.options === 'object') {
      normalizedOptions = Object.values(question.options as Record<string, unknown>).map((option) => String(option))
    } else {
      normalizedOptions = undefined
    }

    return {
      ...question,
      options: normalizedOptions,
    }
  })

  return data
}

async function submitResponse(
  baseUrl: string,
  formId: string,
  answers: Record<string, any>,
  profile: ReturnType<typeof buildRespondentProfiles>[number],
  dryRun: boolean,
) {
  if (dryRun) {
    console.log('📝 Dry run payload:', {
      respondent_name: profile.name,
      respondent_email: profile.email,
      answers,
    })
    return
  }

  const response = await fetch(`${baseUrl}/api/forms/${formId}/responses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'FormSeedScript/1.1',
    },
    body: JSON.stringify({
      respondent_name: profile.name,
      respondent_email: profile.email,
      answers,
    }),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Failed to submit response (${response.status}): ${message}`)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  const args = parseArgs()

  console.log('==============================================')
  console.log('🧪 Form Sample Response Seeder')
  console.log('==============================================')
  console.log(`📄 Form ID: ${args.formId}`)
  console.log(`🔢 Responses to create: ${args.count}`)
  console.log(`🌐 API base URL: ${args.baseUrl}`)
  console.log(`🧪 Dry run: ${args.dryRun ? 'Yes' : 'No'}`)
  console.log(`⏱️ Delay between submissions: ${args.delayMs} ms`)
  console.log('----------------------------------------------')

  try {
    const form = await fetchForm(args.baseUrl, args.formId)
    console.log(`✅ Form "${form.title}" loaded with ${form.questions.length} questions.`)

    const profiles = buildRespondentProfiles(Math.max(args.count, 1))
    const payload = buildResponsesPayload(form, profiles, args.count)
    let successCount = 0

    for (let i = 0; i < payload.length; i++) {
      const { profile, answers } = payload[i]

      await submitResponse(args.baseUrl, args.formId, answers, profile, args.dryRun)
      successCount += 1

      console.log(`✔️  Created response ${i + 1}/${payload.length} for ${profile.name}`)
      if (args.delayMs > 0 && i < payload.length - 1) {
        await sleep(args.delayMs)
      }
    }

    console.log('----------------------------------------------')
    console.log(`🎉 Completed seeding. Responses created: ${successCount}`)
    if (args.dryRun) {
      console.log('ℹ️  Dry run mode: No data was written. Remove --dry-run to submit.')
    } else {
      console.log('📊 Refresh the statistics page to see the updated charts.')
    }
  } catch (error) {
    console.error('❌ Error seeding responses:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

void main()
