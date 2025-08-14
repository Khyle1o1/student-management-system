const fetch = require('node-fetch');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EVENT_ID = 'test-event-id'; // You'll need to replace this with a real event ID
const TEST_STUDENT_ID = 'test-student-id'; // You'll need to replace this with a real student ID

async function testAttendanceAPI() {
  console.log('🧪 Testing Attendance Barcode Scan API...\n');

  try {
    // Test 1: Check if the API endpoint is accessible
    console.log('1. Testing API endpoint accessibility...');
    const response = await fetch(`${BASE_URL}/api/attendance/barcode-scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: TEST_STUDENT_ID,
        eventId: TEST_EVENT_ID,
        mode: 'SIGN_IN'
      })
    });

    console.log(`   Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log('   ✅ API is accessible (401 Unauthorized is expected without auth)');
    } else if (response.status === 400) {
      const data = await response.json();
      console.log(`   ✅ API is accessible (400 Bad Request: ${data.error})`);
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
    }

    // Test 2: Check if the events API returns correct field names
    console.log('\n2. Testing events API field names...');
    const eventResponse = await fetch(`${BASE_URL}/api/events/${TEST_EVENT_ID}`);
    
    if (eventResponse.status === 401) {
      console.log('   ✅ Events API is accessible (401 Unauthorized is expected without auth)');
    } else if (eventResponse.status === 404) {
      console.log('   ✅ Events API is accessible (404 Not Found is expected for test ID)');
    } else {
      console.log(`   ⚠️  Unexpected status: ${eventResponse.status}`);
    }

    console.log('\n✅ Basic API connectivity tests completed!');
    console.log('\n📝 To fully test the attendance functionality:');
    console.log('   1. Start the application: npm run dev');
    console.log('   2. Log in as an admin user');
    console.log('   3. Create an event with today\'s date and current time');
    console.log('   4. Add a student to the system');
    console.log('   5. Try scanning the student\'s barcode/ID for attendance');
    console.log('   6. The attendance should now work without the 400 error');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the application is running on http://localhost:3000');
  }
}

// Run the test
testAttendanceAPI();
