export type QuestionType =
  | 'short_answer'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkbox'
  | 'linear_scale'
  | 'dropdown'
  | 'date'
  | 'time'
  | 'email'
  | 'rating'

export interface Question {
  id: string
  type: QuestionType
  question: string
  description?: string | null
  options?: string[]
  required?: boolean
  min_value?: number
  max_value?: number
  min_label?: string
  max_label?: string
  rating_style?: 'star' | 'heart' | 'thumbs'
}

export interface FormDataShape {
  id: string
  title: string
  description?: string | null
  questions: Question[]
  settings?: Record<string, any>
  status?: string
}

export interface RespondentProfile {
  name: string
  email: string
  department: string
  program: string
  yearLevel: string
  phone: string
  studentNumber: string
  commentFocus: 'content' | 'speakers' | 'logistics' | 'networking' | 'overall'
}

const SAMPLE_NAMES = [
  'Ava Santos',
  'Liam Reyes',
  'Sofia Dela Cruz',
  'Noah Garcia',
  'Mia Ramos',
  'Ethan Bautista',
  'Isabella Navarro',
  'Lucas Villanueva',
  'Amelia Flores',
  'Benjamin Aquino',
  'Chloe Serrano',
  'Daniel Mercado',
  'Ella Panganiban',
  'Gabriel Salazar',
  'Harper Dominguez',
  'Ian Lozano',
  'Jasmine Cabrera',
  'Kevin Lim',
  'Luna Ferrer',
  'Mason Sy',
  'Nina Ocampo',
  'Oscar Vergara',
  'Penelope Yao',
  'Quentin Morales',
  'Riley Ponce',
  'Sienna Gatchalian',
  'Theo Vergara',
  'Una Soriano',
  'Vince Marquez',
  'Willow Go',
  'Xander Uy',
  'Yara Quiambao',
  'Zach Torres',
]

const SAMPLE_PROGRAMS = [
  { department: 'College of Engineering', program: 'BS Information Technology' },
  { department: 'College of Business', program: 'BS Accountancy' },
  { department: 'College of Education', program: 'BSE English' },
  { department: 'College of Arts & Sciences', program: 'BS Psychology' },
  { department: 'College of Nursing', program: 'BS Nursing' },
  { department: 'College of Agriculture', program: 'BS Agribusiness' },
  { department: 'College of Engineering', program: 'BS Electronics Engineering' },
  { department: 'College of Business', program: 'BS Entrepreneurship' },
  { department: 'College of Arts & Sciences', program: 'BA Communication' },
  { department: 'College of Education', program: 'BSE Mathematics' },
]

const SAMPLE_COMMENTS: Record<RespondentProfile['commentFocus'], string[]> = {
  content: [
    'The topics were highly relevant and well-presented. I gained practical insights I can apply immediately.',
    'I appreciated how the sessions tied theory to real-world applications. The case studies were excellent.',
    'The program structure was solid, but adding more advanced content in the afternoon would make it perfect.',
  ],
  speakers: [
    'The speakers were dynamic and engaging. Their stories made the concepts easier to understand.',
    'I particularly enjoyed the keynote speaker—very inspiring and relatable.',
    'The guest lecturers were knowledgeable, though one session felt a bit rushed near the end.',
  ],
  logistics: [
    'Registration was smooth and the venue was comfortable. Maybe just improve the AV setup for future events.',
    'Overall logistics were impressive. Starting on time and clear instructions helped a lot.',
    'The program flowed well, though the air-conditioning in the main hall could be adjusted.',
  ],
  networking: [
    'I met so many peers from different colleges. The networking activities were thoughtfully designed.',
    'Breakout sessions encouraged interaction. Maybe add a dedicated networking hour to maximize connections.',
    'Loved the collaborative workshops—they helped me connect with students I normally wouldn’t meet.',
  ],
  overall: [
    'This was one of the best events I’ve attended this semester. Congratulations to the organizers!',
    'Great balance of learning and engagement. I’m looking forward to more events like this.',
    'Overall experience was positive. With a few tweaks to the schedule, it could be outstanding.',
  ],
}

const SAMPLE_SHORT_REMARKS = [
  'Very informative!',
  'Great learning experience.',
  'I enjoyed the event a lot.',
  'Eye-opening sessions.',
  'Well-organized and relevant.',
  'I loved the interactive parts.',
]

const YES_NO_RESPONSES = ['Yes', 'No']

export function slugify(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildRespondentProfiles(total: number): RespondentProfile[] {
  const profiles: RespondentProfile[] = []

  for (let i = 0; i < total; i++) {
    const name = SAMPLE_NAMES[i % SAMPLE_NAMES.length]
    const programInfo = SAMPLE_PROGRAMS[i % SAMPLE_PROGRAMS.length]
    const sanitized = slugify(name).replace(/-/g, '.')
    const email = `${sanitized}.${i}@sampleforms.test`
    const phone = `09${((i * 73) % 900000000 + 100000000).toString().padStart(9, '0')}`
    const studentNumber = `202${(i % 5) + 1}-BU-${(1000 + i).toString()}`
    const commentFocus = (['content', 'speakers', 'logistics', 'networking', 'overall'] as RespondentProfile['commentFocus'][])[
      i % 5
    ]

    profiles.push({
      name,
      email,
      department: programInfo.department,
      program: programInfo.program,
      yearLevel: `Year ${(i % 4) + 1}`,
      phone,
      studentNumber,
      commentFocus,
    })
  }

  return profiles
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

function randomItemWeighted<T>(items: Array<{ value: T; weight: number }>): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight

  for (const item of items) {
    random -= item.weight
    if (random <= 0) {
      return item.value
    }
  }

  return items[items.length - 1].value
}

function generateMultipleChoiceAnswer(options: string[], questionText: string): string {
  const normalized = options.map((opt) => opt.toLowerCase())
  const hasLikertScale =
    normalized.includes('excellent') ||
    normalized.includes('very satisfied') ||
    normalized.includes('strongly agree')

  if (hasLikertScale) {
    const weightedOptions = options.map((option) => {
      const lower = option.toLowerCase()
      if (lower.includes('excellent') || lower.includes('very') || lower.includes('strongly agree')) {
        return { value: option, weight: 6 }
      }
      if (lower.includes('good') || lower.includes('agree')) {
        return { value: option, weight: 4 }
      }
      if (lower.includes('fair') || lower.includes('neutral')) {
        return { value: option, weight: 2 }
      }
      return { value: option, weight: 1 }
    })
    return randomItemWeighted(weightedOptions)
  }

  if (normalized.includes('yes') && normalized.includes('no')) {
    return randomItemWeighted([
      { value: options[normalized.indexOf('yes')], weight: 7 },
      { value: options[normalized.indexOf('no')], weight: 3 },
    ])
  }

  if (questionText.toLowerCase().includes('gender') && options.length >= 2) {
    return randomItemWeighted(
      options.map((option) => ({
        value: option,
        weight: 5,
      })),
    )
  }

  return randomItem(options)
}

function generateCheckboxAnswer(options: string[]): string[] {
  const selectionCount = Math.max(1, Math.round(Math.random() * Math.min(3, options.length)))
  const shuffled = [...options].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, selectionCount)
}

function generateLinearScale(minValue = 1, maxValue = 5): number {
  const bias = Math.random()
  if (bias < 0.6) {
    return maxValue
  }
  if (bias < 0.85) {
    return Math.max(minValue, maxValue - 1)
  }
  if (bias < 0.95) {
    return Math.max(minValue, maxValue - 2)
  }
  return Math.floor(Math.random() * (maxValue - minValue + 1)) + minValue
}

function generateDateAnswer(index: number): string {
  const base = new Date()
  base.setDate(base.getDate() - (index % 10))
  return base.toISOString().split('T')[0]
}

function generateTimeAnswer(index: number): string {
  const hour = 9 + (index % 8)
  const minute = index % 2 === 0 ? '00' : '30'
  return `${hour.toString().padStart(2, '0')}:${minute}`
}

function generateShortAnswer(question: Question, profile: RespondentProfile, responseIndex: number): string {
  const text = question.question.toLowerCase()

  if (text.includes('name')) {
    return profile.name
  }
  if (text.includes('email')) {
    return profile.email
  }
  if (text.includes('course') || text.includes('program')) {
    return profile.program
  }
  if (text.includes('department') || text.includes('college')) {
    return profile.department
  }
  if (text.includes('year')) {
    return profile.yearLevel
  }
  if (text.includes('contact') || text.includes('phone')) {
    return profile.phone
  }
  if (text.includes('student id') || text.includes('student no') || text.includes('student number')) {
    return profile.studentNumber
  }
  if (text.includes('attendance') || text.includes('participants')) {
    return (50 + (responseIndex % 25)).toString()
  }

  return randomItem(SAMPLE_SHORT_REMARKS)
}

function generateParagraphAnswer(question: Question, profile: RespondentProfile): string {
  const focus = profile.commentFocus
  const commentSet = SAMPLE_COMMENTS[focus]
  if (question.description && question.description.toLowerCase().includes('improve')) {
    const improvementNotes = [
      'Perhaps extend the Q&A segment so more students can raise their questions.',
      'Posting the materials ahead of time would help us prepare better.',
      'Maybe add a quick feedback recap at the end so everyone leaves with clear takeaways.',
    ]
    return `${randomItem(commentSet)} ${randomItem(improvementNotes)}`
  }

  return randomItem(commentSet)
}

export function generateAnswerForQuestion(
  question: Question,
  profile: RespondentProfile,
  responseIndex: number,
): string | string[] | number {
  switch (question.type) {
    case 'short_answer':
      return generateShortAnswer(question, profile, responseIndex)
    case 'email':
      return profile.email
    case 'paragraph':
      return generateParagraphAnswer(question, profile)
    case 'multiple_choice':
    case 'dropdown': {
      const options = question.options ?? YES_NO_RESPONSES
      return generateMultipleChoiceAnswer(options, question.question)
    }
    case 'checkbox': {
      const options = question.options ?? YES_NO_RESPONSES
      const answers = generateCheckboxAnswer(options)
      return answers.length > 0 ? answers : [options[0]]
    }
    case 'linear_scale':
    case 'rating':
      return generateLinearScale(question.min_value, question.max_value)
    case 'date':
      return generateDateAnswer(responseIndex)
    case 'time':
      return generateTimeAnswer(responseIndex)
    default:
      return randomItem(SAMPLE_SHORT_REMARKS)
  }
}

export function buildAnswers(form: FormDataShape, profile: RespondentProfile, responseIndex: number) {
  const answers: Record<string, any> = {}

  for (const question of form.questions) {
    const value = generateAnswerForQuestion(question, profile, responseIndex)

    if (question.required && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
      answers[question.id] =
        question.type === 'checkbox'
          ? [question.options?.[0] ?? 'Yes']
          : question.type === 'linear_scale' || question.type === 'rating'
          ? generateLinearScale(question.min_value, question.max_value)
          : typeof value === 'string' && value.trim().length > 0
          ? value
          : randomItem(SAMPLE_SHORT_REMARKS)
    } else {
      answers[question.id] = value
    }
  }

  return answers
}

export function buildResponsesPayload(
  form: FormDataShape,
  profiles: RespondentProfile[],
  count: number,
): Array<{
  profile: RespondentProfile
  answers: Record<string, any>
}> {
  const payload: Array<{ profile: RespondentProfile; answers: Record<string, any> }> = []

  for (let i = 0; i < count; i++) {
    const profile = profiles[i % profiles.length]
    const answers = buildAnswers(form, profile, i)
    payload.push({ profile, answers })
  }

  return payload
}

