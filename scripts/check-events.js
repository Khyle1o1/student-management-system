const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkEvents() {
  try {
    console.log('🔍 Checking existing events...')
    
    // Get all events
    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching events:', error)
      return
    }

    console.log(`📊 Found ${events.length} events:`)
    
    if (events.length === 0) {
      console.log('❌ No events found in database')
      console.log('💡 You need to create an event first to test the report generation')
      console.log('🌐 Go to: http://localhost:3000/dashboard/events/new')
      return
    }

    events.forEach((event, index) => {
      console.log(`\n${index + 1}. Event: ${event.title}`)
      console.log(`   ID: ${event.id}`)
      console.log(`   Date: ${event.date}`)
      console.log(`   Location: ${event.location || 'TBD'}`)
      console.log(`   Scope: ${event.scope_type}`)
      console.log(`   Created: ${new Date(event.created_at).toLocaleDateString()}`)
    })

    // Test report generation with the first event
    if (events.length > 0) {
      const firstEvent = events[0]
      console.log(`\n🧪 Testing report generation for event: ${firstEvent.title}`)
      console.log(`📄 Report URL: http://localhost:3000/api/events/${firstEvent.id}/report`)
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

async function createTestEvent() {
  try {
    console.log('🎯 Creating test event...')
    
    const testEvent = {
      title: 'Test Event for Report Generation',
      description: 'This is a test event created to verify PDF report generation functionality',
      date: new Date().toISOString().split('T')[0], // Today's date
      start_time: '09:00',
      end_time: '17:00',
      location: 'Main Auditorium',
      type: 'ACADEMIC',
      max_capacity: 100,
      scope_type: 'UNIVERSITY_WIDE',
      scope_college: null,
      scope_course: null,
      require_evaluation: false
    }

    const { data: event, error } = await supabase
      .from('events')
      .insert([testEvent])
      .select()
      .single()

    if (error) {
      console.error('Error creating test event:', error)
      return
    }

    console.log('✅ Test event created successfully!')
    console.log(`📝 Event ID: ${event.id}`)
    console.log(`📄 Report URL: http://localhost:3000/api/events/${event.id}/report`)
    console.log(`🌐 Edit URL: http://localhost:3000/dashboard/events/${event.id}`)

  } catch (error) {
    console.error('Error creating test event:', error)
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--create')) {
    await createTestEvent()
  } else {
    await checkEvents()
    
    if (args.includes('--help')) {
      console.log('\n📖 Usage:')
      console.log('  node scripts/check-events.js          # Check existing events')
      console.log('  node scripts/check-events.js --create # Create a test event')
      console.log('  node scripts/check-events.js --help   # Show this help')
    }
  }
}

main()
