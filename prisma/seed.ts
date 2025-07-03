import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@school.edu' },
    update: {},
    create: {
      email: 'admin@school.edu',
      password: adminPassword,
      role: 'ADMIN',
      name: 'System Administrator',
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Create student users with associated student records
  const studentPassword = await bcrypt.hash('student123', 12)
  
  const students = [
    {
      email: 'john.doe@student.edu',
      name: 'John Doe',
      studentId: '2024001',
      yearLevel: 'YEAR_3',
      course: 'Computer Science',
    },
    {
      email: 'jane.smith@student.edu',
      name: 'Jane Smith',
      studentId: '2024002',
      yearLevel: 'YEAR_2',
      course: 'Information Technology',
    },
    {
      email: 'mike.johnson@student.edu',
      name: 'Mike Johnson',
      studentId: '2024003',
      yearLevel: 'YEAR_4',
      course: 'Computer Engineering',
    },
    {
      email: 'test@student.edu',
      name: 'Test Student',
      studentId: '2024999',
      yearLevel: 'YEAR_1',
      course: 'Computer Science',
    }
  ]

  for (const studentData of students) {
    // Create user first
    const user = await prisma.user.upsert({
      where: { email: studentData.email },
      update: {},
      create: {
        email: studentData.email,
        password: studentPassword,
        role: 'STUDENT',
        name: studentData.name,
      },
    })

    // Create associated student record
    const student = await prisma.student.create({
      data: {
        studentId: studentData.studentId,
        userId: user.id,
        name: studentData.name,
        email: studentData.email,
        yearLevel: studentData.yearLevel as any,
        course: studentData.course,
      }
    })

    console.log('✅ Student created:', student.studentId, '-', student.name)
  }

  // Create some sample events
  const sampleEvents = [
    {
      title: 'Orientation Day',
      description: 'Welcome orientation for new students',
      type: 'ACADEMIC' as const,
      date: new Date('2024-01-15'),
      startTime: new Date('2024-01-15T09:00:00'),
      endTime: new Date('2024-01-15T17:00:00'),
      location: 'Main Auditorium',
      maxCapacity: 200,
      semester: 'Spring 2024',
      schoolYear: '2023-2024'
    },
    {
      title: 'Programming Workshop',
      description: 'Introduction to Python programming',
      type: 'WORKSHOP' as const,
      date: new Date('2024-01-20'),
      startTime: new Date('2024-01-20T14:00:00'),
      endTime: new Date('2024-01-20T16:00:00'),
      location: 'Computer Lab 1',
      maxCapacity: 30,
      semester: 'Spring 2024',
      schoolYear: '2023-2024'
    }
  ]

  for (const eventData of sampleEvents) {
    // Check if event already exists
    const existingEvent = await prisma.event.findFirst({
      where: { title: eventData.title }
    })

    if (!existingEvent) {
      const event = await prisma.event.create({
        data: {
          ...eventData,
          createdBy: admin.id,
        },
      })
      console.log('✅ Event created:', event.title)
    } else {
      console.log('ℹ️ Event already exists:', eventData.title)
    }
  }

  console.log('🎉 Seeding completed successfully!')
  console.log('')
  console.log('📝 Test Accounts Created:')
  console.log('Admin Account:')
  console.log('  Email: admin@school.edu')
  console.log('  Password: admin123')
  console.log('')
  console.log('Student Accounts:')
  console.log('  Email: john.doe@student.edu')
  console.log('  Password: student123')
  console.log('')
  console.log('  Email: jane.smith@student.edu')
  console.log('  Password: student123')
  console.log('')
  console.log('  Email: test@student.edu')
  console.log('  Password: student123')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 